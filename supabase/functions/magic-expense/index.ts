import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // 1. Manejo de CORS obligatorio para navegadores
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
        
        // 2. Extraer los Headers de Autorización
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "No autorizado. Falta token." }), { status: 401, headers: corsHeaders })
        }
        
        // Eliminar 'Bearer ' del inicio para obtener solo el JWT puro
        const token = authHeader.replace('Bearer ', '').trim();
        
        // Inicializar cliente configurando la cabecera GLOBAL Authorization con el token real
        // Esto es absolutamente necesario para que PostgreSQL te reconozca como el usuario
        // y te permita pasar el escudo RLS.
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } }
        })

        // Verificamos explícitamente el token puro con Supabase Auth pasándolo como argumento
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

        if (userError || !user) {
            console.error("Auth error:", userError?.message);
            return new Response(JSON.stringify({ error: "Token inválido o expirado." }), { status: 401, headers: corsHeaders })
        }

        // 3. Obtener el texto del cliente
        const { text, currentMonth } = await req.json()
        if (!text) throw new Error("Debes enviar un texto a la inteligencia artificial");

        // 4. Configurar el request hacia Azure OpenAI
        const AZURE_API_KEY = Deno.env.get("AZURE_OPENAI_API_KEY");
        const ENDPOINT = Deno.env.get("AZURE_OPENAI_ENDPOINT") || "https://jcardenasm-2116-resource.openai.azure.com/";
        const DEPLOYMENT = Deno.env.get("AZURE_OPENAI_DEPLOYMENT_NAME") || "gpt-4.1";
        const API_VERSION = Deno.env.get("AZURE_OPENAI_API_VERSION") || "2024-05-01-preview";

        if (!AZURE_API_KEY) {
             throw new Error("El administrador no ha configurado el AZURE_OPENAI_API_KEY en el servidor.");
        }

        const url = `${ENDPOINT}openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`;
        
        // 5. El System Prompt
        const systemPrompt = `Eres el asistente financiero de la app "Payments On Time" para Colombia.
Tu objetivo es extraer los detalles de un nuevo gasto a partir de lo que el usuario dicte y devolver ÚNICAMENTE un objeto JSON válido, sin formato extra ni markdown.

Propiedades del JSON esperado:
- "name": (string) Nombre descriptivo (ej: "Café con pan", "Arriendo local", "Pasajes").
- "amount": (number) Valor numérico entero exacto en pesos (ej: 20000, 150000). Si dice '20 mil', debes convertirlo a 20000.
- "category": (string) Clasifica estrictamente en una de estas opciones: 'tarjetas', 'recibos', 'deudas', 'creditos', 'manutenciones', 'suscripciones', 'arriendo', 'seguros', 'educacion', 'transporte', 'compras', 'entretenimiento', 'compromisos'. (Si no sabes, usa 'compras' o 'entretenimiento').
- "due_day": (number) Día del mes (1-31). Si menciona fechas de vencimiento futuro (ej. "el día 15"), usa ese número. Si es un gasto que ya ocurrió en el pasado como "ayer", calcula el número del día correspondiente restando al día actual. Si no especifica o dice "hoy", usa el día actual.
- "is_spontaneous": (boolean) 'true' si es un gasto ocasional, efímero o que ya se pagó (ej. "me gasté", "ayer compré", "almuerzo"). 'false' si es algo programado/fijo que se agenda a futuro (ej: "pagar la luz los 15").

Si es imposible deducir un valor monetario (amount), debes devolver: {"error": "Falta el valor"}

Día actual de referencia (para cálculos de "hoy" o "ayer"): Día ${new Date().getDate()}`;

        // Llamar a Azure OpenAI
        const azureRes = await fetch(url, {
            method: "POST",
            headers: {
                "api-key": AZURE_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text }
                ],
                temperature: 0.1, // Baja temperatura
                response_format: { type: "json_object" }
            })
        });

        if (!azureRes.ok) {
            const errRes = await azureRes.text();
            throw new Error(`Error invocando Azure: ${errRes}`);
        }

        const azureData = await azureRes.json();
        const resultContent = azureData.choices[0].message.content;
        let expenseData;
        try {
            expenseData = JSON.parse(resultContent);
        } catch(e) {
            throw new Error("El modelo de IA no devolvió un JSON válido.");
        }

        if (expenseData.error) {
            return new Response(JSON.stringify({ error: expenseData.error, message: "¿Podrías darme un valor para ese gasto?" }), { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 
            });
        }

        // 6. ¡Lo guardamos en la base de datos!
        const monthStr = currentMonth || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        
        // A) Crear el Gasto (Catálogo)
        const { data: newExpense, error: expError } = await supabaseClient
            .from('expenses')
            .insert({
                user_id: user.id, // Gracias al JWT, el backend sabe de forma segura que eres tú!
                name: expenseData.name,
                amount: expenseData.amount,
                due_day: expenseData.due_day || new Date().getDate(),
                category: expenseData.category || 'compromisos',
                is_spontaneous: expenseData.is_spontaneous === true
            })
            .select('*')
            .single();

        if (expError) throw expError;

        // B) Crear el Pago vinculado al mes (Registro)
        const isCompleted = expenseData.is_spontaneous === true;
        let completedDate = null;
        if (isCompleted) {
            const dateObj = new Date();
            if (expenseData.due_day && typeof expenseData.due_day === 'number') {
                dateObj.setDate(expenseData.due_day);
            }
            completedDate = dateObj.toISOString();
        }

        const { error: payError } = await supabaseClient
            .from('payments')
            .insert({
                expense_id: newExpense.id,
                month_year: monthStr,
                completed: isCompleted,
                completed_at: completedDate,
                amount_paid: isCompleted ? expenseData.amount : null // Optimista
            });
            
        if (payError) throw payError;

        // 7. Retornar éxito
        return new Response(JSON.stringify({ 
            success: true, 
            data: expenseData, 
            expense: newExpense 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error("Function Error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
