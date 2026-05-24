# Payments On Time 🕒💳

> Un sistema moderno, privado y visualmente atractivo para llevar el control de tus pagos recurrentes mes a mes sin olvidar nunca un compromiso.

Este proyecto nació con el propósito de ofrecer una solución sencilla pero persistente al problema de los olvidos financieros mensuales (tarjetas, servicios públicos, créditos, manutenciones, etc.). A diferencia de los rastreadores financieros complejos, **Payments On Time** está diseñado específicamente para hacer un *checklist* de tus compromisos del mes y llevar las deudas antiguas al presente si alguna vez se olvidan.

---

## ✨ Características Principales

- 🔄 **Reinicio Inteligente Mensual:** Al iniciar un nuevo mes, los pagos se generan automáticamente. ¡No tienes que volver a escribirlos!
- 🚨 **Persistencia de Deudas:** Si olvidaste marcar un pago como completado el mes pasado, no desaparece. Se arrastra como un compromiso "Vencido" al mes actual.
- 🎨 **Diseño Premium (Glassmorphism):** Interfaz fluida, moderna y agradable a la vista, con modo oscuro nativo e indicadores visuales de progreso.
- 🔒 **Seguridad y Privacidad:** Gracias a la integración con **Supabase**, cada usuario tiene su propia cuenta segura. Solamente tú tienes acceso a visualizar y gestionar tu historial de pagos mediante *Row Level Security (RLS)*.
- 🛡️ **Protección Anti-Bots (hCaptcha):** Seguridad de nivel empresarial en la creación de cuentas e inicio de sesión.
- ⚡ **Rendimiento Inmediato:** Construido de forma reactiva con React y Vite.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React, Vite (Arquitectura SPA veloz)
- **Estilos:** Vanilla CSS (Aprovechando variables modernas y diseño *glassmorphism*)
- **Iconografía:** Lucide React
- **Backend & Base de Datos:** Supabase (PostgreSQL)
- **Autenticación e Identidad:** Supabase Auth (Email/Contraseña)
- **Seguridad:** hCaptcha
- **Despliegue Recomendado:** Vercel

---

## 🚀 Instalación Local (Desarrollo)

Sigue estos simples pasos para tener tu entorno local funcionando:

### 1. Clonar el repositorio

```bash
git clone https://github.com/jonathancm29/paymentsOnTime.git
cd paymentsOnTime
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Supabase

1. Crea un nuevo proyecto en [Supabase](https://supabase.com/).
2. En tu panel de Supabase, ve al apartado **SQL Editor**.
3. Ejecuta el script de creación de tablas que puedes encontrar a continuación:

<details>
<summary><b>Haz clic aquí para ver el Script SQL (Schemas + Segurida RLS)</b></summary>

```sql
-- (OPCIONAL) Descomenta si deseas reiniciar las tablas nuevas de proyectos
-- DROP TABLE IF EXISTS public.project_transactions;
-- DROP TABLE IF EXISTS public.project_accounts;

-- 1. Tabla del Catálogo de Gastos ligada al Usuario
CREATE TABLE public.expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL, 
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31)
);

-- 2. Tabla de Instancias de Pagos del Mes ligada al Gasto
CREATE TABLE public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
    month_year TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Evitar duplicados del mismo mes para el mismo gasto
    UNIQUE (expense_id, month_year)
);

-- 3. Tabla de Cuentas de Proyectos
CREATE TABLE public.project_accounts (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
    name         TEXT NOT NULL,
    description  TEXT,
    budget       NUMERIC,          -- NULL = sin presupuesto
    archived     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabla de Transacciones de Proyectos
CREATE TABLE public.project_transactions (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id       UUID NOT NULL REFERENCES public.project_accounts(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
    description      TEXT NOT NULL,
    amount           NUMERIC NOT NULL,   -- positivo = ingreso/aporte, negativo = gasto
    category         TEXT NOT NULL DEFAULT 'general',
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_project_tx_project        ON public.project_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tx_user_date      ON public.project_transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_project_accounts_user     ON public.project_accounts(user_id);

-- 6. Configurar Row Level Security (RLS)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_transactions ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de Seguridad (Solo el dueño puede gestionar)
CREATE POLICY "Users can manage their own expenses" 
ON public.expenses FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own payments" 
ON public.payments FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owners can manage project_accounts"
ON public.project_accounts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owners can manage project_transactions"
ON public.project_transactions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 8. Trigger para mantener updated_at en project_accounts
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_accounts_updated_at ON public.project_accounts;
CREATE TRIGGER trg_project_accounts_updated_at
  BEFORE UPDATE ON public.project_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
```
</details>

### 4. Variables de Entorno y Configuración de Claves

En la raíz del proyecto, crea un archivo `.env.local` con la siguiente información obtenida de **Project Settings > API** en Supabase:

```env
VITE_SUPABASE_URL=tu_supabase_project_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

*Nota: La aplicación integra protección **hCaptcha**. Si vas a usar tus propias credenciales o recibes errores de "sitekey", asegúrate de tener una Site Key válida configurada dentro del archivo `App.jsx`.*

### 5. Iniciar la aplicación

```bash
npm run dev
```

La aplicación estará corriendo normalmente en `http://localhost:5173`.

---

## 🌐 Despliegue en Vercel

Dado que la aplicación está optimizada con `vercel.json` para gestionar el routing de SPA, desplegarla es sumamente fácil.

1. Ve a [Vercel](https://vercel.com/) e inicia sesión.
2. Importa tu repositorio de GitHub `paymentsOnTime`.
3. Al configurar el proyecto en Vercel, es **crítico que agregues tus Variables de Entorno (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`)** antes de hacer click en "Deploy".
4. Espera a que termine la construcción y tu aplicación estará disponible globalmente en su propia URL.
