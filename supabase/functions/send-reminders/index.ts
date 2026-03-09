import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Manejo de CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Inicializamos el cliente de Supabase usando la clave de administrador (Service Role Key)
        // Esto es NECESARIO para que la función pueda consultar la tabla privada "auth.users" y extraer los correos.
        const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

        // 1. Determinar la fecha actual para saber qué pagos vencen hoy, mañana o vencieron ayer.
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

        const targetDays = [currentDay, currentDay + 1, currentDay - 1]; // Hoy, Mañana, Ayer

        // 2. Buscar en la base de datos todas las instancias de pago NO completadas de este mes, cuyo gasto venza en los targetDays
        const { data: payments, error: paymentsError } = await supabaseAdmin
            .from('payments')
            .select(`
        id,
        month_year,
        completed,
        user_id,
        expenses!inner (
          id,
          name,
          amount,
          due_day
        )
      `)
            .eq('completed', false)
            .eq('month_year', currentMonthStr)
            .in('expenses.due_day', targetDays);

        if (paymentsError) throw paymentsError;

        if (!payments || payments.length === 0) {
            return new Response(JSON.stringify({ message: "Sin recordatorios agendados para las fechas objetivo." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // 3. Agrupar los pagos por usuario para enviar un solo correo por persona
        const userPayments = payments.reduce((acc, curr) => {
            if (!acc[curr.user_id]) acc[curr.user_id] = [];
            acc[curr.user_id].push(curr);
            return acc;
        }, {});


        // 4. Buscar el correo electrónico de cada usuario y enviar a través de la API de Resend
        let emailsSent = 0;
        let errors = [];

        for (const userId of Object.keys(userPayments)) {
            const userPending = userPayments[userId];

            // Extraer correo desde la tabla privada de Auth
            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

            if (userError || !userData?.user?.email) {
                console.error("No se pudo obtener el correo para el usuario", userId);
                continue;
            }

            const email = userData.user.email;

            // Construir el cuerpo HTML del correo
            let emailHtml = `
       <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
         <h2 style="color: #6366f1;">🔔 Alerta de Pagos Pendientes</h2>
         <p>Hola! Tienes compromisos en <strong>Payments On Time</strong> que requieren tu atención inmediata:</p>
         <ul style="padding-left: 20px; font-size: 16px;">
       `;

            userPending.forEach(p => {
                let status = "";
                let color = "";
                if (p.expenses.due_day === currentDay) { status = "🔥 VENCE HOY"; color = "#f97316"; } // Naranja
                else if (p.expenses.due_day > currentDay) { status = "⏳ VENCE MAÑANA"; color = "#3b82f6"; } // Azul
                else { status = "🚨 ATRASADO"; color = "#ef4444"; } // Rojo

                emailHtml += `<li style="margin-bottom: 10px;">
           <strong>${p.expenses.name}</strong>: $${p.expenses.amount.toLocaleString('es-CO')} 
           <span style="color: ${color}; font-weight: bold; font-size: 0.9em;">(${status})</span>
           </li>`;
            });

            emailHtml += `
         </ul>
         <p style="margin-top: 30px;">
           <a href="https://mi-aplicacion.vercel.app/" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
             Marcar como Pagados
           </a>
         </p>
         <p style="font-size: 12px; color: #888; margin-top: 40px;">Este es un mensaje automático generado por tu asistente financiero.</p>
       </div>
       `;

            // Realizar la petición directamente a Resend
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: 'Recordatorios <onboarding@resend.dev>', // Correo especial gratuito de Resend
                    to: email, // En la capa gratuita, DEBE SER EL CORREO EXACTO con el que creaste tu cuenta de resend.com
                    subject: '📅 Tienes Pagos por Realizar (Payments On Time)',
                    html: emailHtml
                })
            });

            if (res.ok) {
                emailsSent++;
            } else {
                const resError = await res.text();
                console.error("Error en API de Resend para", email, resError);
                errors.push(resError);
            }
        }

        return new Response(JSON.stringify({ success: true, emailsSent, errors }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error("Error Fatal:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
