import { useState } from 'react';
import {
  FolderKanban, Search, Plus, Trash2, Edit2, Archive, ArchiveRestore,
  AlertTriangle, Copy, Check, Database, X, Landmark, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import ProjectForm from './ProjectForm';

export default function ProjectsDashboard({
  session,
  projectsHook,
  onOpenProject,
  onBackToMonthly
}) {
  const {
    loading,
    error,
    tablesMissing,
    usingLocalStorage,
    enableLocalStorageMode,
    projects,
    createProject,
    updateProject,
    archiveProject,
    deleteProject,
    refetch
  } = projectsHook;

  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const SQL_SCRIPT = `-- 1. Tabla de Cuentas de Proyectos
CREATE TABLE IF NOT EXISTS public.project_accounts (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
    name         TEXT NOT NULL,
    description  TEXT,
    budget       NUMERIC,          -- NULL = sin presupuesto
    archived     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabla de Transacciones de Proyectos
CREATE TABLE IF NOT EXISTS public.project_transactions (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id       UUID NOT NULL REFERENCES public.project_accounts(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
    description      TEXT NOT NULL,
    amount           NUMERIC NOT NULL,   -- positivo = ingreso/aporte, negativo = gasto
    category         TEXT NOT NULL DEFAULT 'general',
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE public.project_accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_transactions  ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de acceso (RLS)
CREATE POLICY "owners can manage project_accounts"
  ON public.project_accounts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owners can manage project_transactions"
  ON public.project_transactions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);`;

  const copySql = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter projects by search query and archived status
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArchive = p.archived === showArchived;
    return matchesSearch && matchesArchive;
  });

  // Calculate metrics for displayed dashboard (from non-archived projects)
  const activeProjects = projects.filter(p => !p.archived);
  const totalBalance = activeProjects.reduce((sum, p) => sum + p.balance, 0);
  const totalIngresos = activeProjects.reduce((sum, p) => sum + p.totalIngresos, 0);
  const totalGastos = activeProjects.reduce((sum, p) => sum + p.totalGastos, 0);

  function handleEditProject(e, project) {
    e.stopPropagation(); // Avoid triggering open project
    setEditingProject(project);
    setProjectModalOpen(true);
  }

  function handleArchiveProject(e, projectId, archivedStatus) {
    e.stopPropagation();
    archiveProject(projectId, archivedStatus);
  }

  async function handleDeleteProject(e, projectId, name) {
    e.stopPropagation();
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el proyecto "${name}" y todo su historial de gastos?`)) {
      try {
        await deleteProject(projectId);
      } catch (err) {
        alert("Error al eliminar el proyecto.");
      }
    }
  }

  function handleCloseModal() {
    setProjectModalOpen(false);
    setEditingProject(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* HEADER GRADIENT PANEL */}
      <header className="glass-panel progress-header" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '100%', background: 'radial-gradient(circle at 100% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 80%)', pointerEvents: 'none' }} />
        
        <div className="progress-info" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', padding: '0.4rem', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
              <FolderKanban size={20} color="white" />
            </div>
            <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', tracking: '0.05em', color: 'var(--color-primary)', fontWeight: 'bold' }}>Control de Proyectos</span>
          </div>

          <h1>Cuentas y Proyectos</h1>
          <p style={{ marginTop: '0.25rem' }}>
            Crea cuentas dedicadas para viajes, metas u obras y controla saldos en tiempo real.
          </p>

          {/* KPI STATS ROW */}
          <div className="stats-row" style={{ marginTop: '1.5rem' }}>
            <div className="stat-item">
              <span className="label">Proyectos Activos</span>
              <span className="value">{activeProjects.length}</span>
            </div>
            <div className="stat-item">
              <span className="label">Balance Neto Total</span>
              <span className="value" style={{ color: totalBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {totalBalance >= 0 ? '+' : ''}${totalBalance.toLocaleString('es-CO')}
              </span>
            </div>
            <div className="stat-item">
              <span className="label">Total Aportado</span>
              <span className="value" style={{ color: 'var(--color-success)' }}>
                ${totalIngresos.toLocaleString('es-CO')}
              </span>
            </div>
            <div className="stat-item">
              <span className="label">Total Gastado</span>
              <span className="value" style={{ color: totalGastos > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                ${totalGastos.toLocaleString('es-CO')}
              </span>
            </div>
          </div>

          {/* USER ACTIONS */}
          <div className="user-actions" style={{ marginTop: '1.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
              {session?.user?.email}
            </span>
            <button className="glass-button" onClick={onBackToMonthly} style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}>
              Volver a Pagos
            </button>
          </div>
        </div>
      </header>

      {/* SQL WARNING BANNER */}
      {tablesMissing && (
        <div className="glass-panel" style={{ borderLeft: '4px solid var(--color-danger)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <AlertTriangle size={24} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>
                Tablas no inicializadas en Supabase
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: '1.4' }}>
                Para guardar tus proyectos y transacciones en la nube de forma segura, es necesario crear las tablas en tu base de datos.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
            <button className="glass-button primary" onClick={() => setSqlModalOpen(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              <Copy size={14} /> Ver Script SQL para Supabase
            </button>
            {!usingLocalStorage ? (
              <button className="glass-button" onClick={() => enableLocalStorageMode(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: 'var(--color-success)', borderColor: 'var(--color-success-glow)' }}>
                <Database size={14} /> Activar Almacenamiento Local
              </button>
            ) : (
              <span style={{ fontSize: '0.85rem', color: 'var(--color-success)', padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Check size={14} /> Modo Local activado (datos en este navegador)
              </span>
            )}
          </div>
        </div>
      )}

      {/* LOCAL STORAGE NOTICE (If tables missing is not active, but user is using LocalStorage) */}
      {!tablesMissing && usingLocalStorage && (
        <div className="glass-panel" style={{ borderLeft: '4px solid var(--color-success)', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Database size={18} color="var(--color-success)" />
            <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
              Estás usando <strong>Modo Local</strong>. Los datos no se sincronizan con Supabase.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="glass-button" onClick={() => setSqlModalOpen(true)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
              Instrucciones Supabase
            </button>
            {session && (
              <button className="glass-button" onClick={() => {
                if (window.confirm("¿Deseas intentar conectarte de nuevo a Supabase? (Si las tablas ya están creadas, verás tus datos remotos)")) {
                  enableLocalStorageMode(false);
                  refetch();
                }
              }} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: 'var(--color-primary)' }}>
                Conectar Supabase
              </button>
            )}
          </div>
        </div>
      )}

      {/* TOOLBAR: SEARCH & ADD */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-input-wrapper" style={{ flex: 1, minWidth: '200px' }}>
          <Search size={18} />
          <input
            type="text"
            className="form-control"
            placeholder={showArchived ? "Buscar en archivados..." : "Buscar un proyecto..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Toggle Archived */}
        <button
          className={`glass-button ${showArchived ? 'primary' : ''}`}
          onClick={() => setShowArchived(!showArchived)}
          style={{ padding: '0.75rem 1rem' }}
        >
          {showArchived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
          {showArchived ? 'Ver Activos' : 'Ver Archivados'}
        </button>

        <button
          className="glass-button primary"
          onClick={() => { setEditingProject(null); setProjectModalOpen(true); }}
          style={{ padding: '0.75rem 1.25rem' }}
        >
          <Plus size={18} /> Nuevo Proyecto
        </button>
      </div>

      {/* PROJECTS GRID */}
      {loading ? (
        <div className="loader"></div>
      ) : filteredProjects.length === 0 ? (
        <div className="empty-state glass-panel">
          <FolderKanban size={48} />
          <h3>No hay proyectos {showArchived ? 'archivados' : ''}</h3>
          <p>
            {searchQuery ? 'Prueba con otra búsqueda.' : showArchived ? 'No tienes proyectos archivados.' : 'Comienza creando tu primer proyecto/viaje.'}
          </p>
        </div>
      ) : (
        <div className="projects-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredProjects.map(project => {
            const hasBudget = project.budget !== null && Number(project.budget) > 0;
            const progress = project.budgetProgressPct;
            const isOverBudget = hasBudget && project.totalGastos > Number(project.budget);

            // Determine budget progress bar color
            let progressColor = 'var(--color-primary)';
            if (progress !== null) {
              if (progress > 100) progressColor = 'var(--color-danger)';
              else if (progress > 80) progressColor = '#f59e0b'; // Amber
              else if (progress > 50) progressColor = '#3b82f6'; // Blue
              else progressColor = 'var(--color-success)';
            }

            return (
              <div
                key={project.id}
                onClick={() => onOpenProject(project.id)}
                className="glass-panel project-card"
                style={{
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '200px',
                  gap: '1rem'
                }}
              >
                {/* Top Section */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--color-text-main)' }}>{project.name}</h3>
                    <div style={{ display: 'flex', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
                      <button className="glass-icon-btn" title="Editar" onClick={(e) => handleEditProject(e, project)}>
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="glass-icon-btn"
                        title={project.archived ? "Desarchivar" : "Archivar"}
                        onClick={(e) => handleArchiveProject(e, project.id, !project.archived)}
                      >
                        {project.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                      </button>
                      <button className="glass-icon-btn danger" title="Eliminar" onClick={(e) => handleDeleteProject(e, project.id, project.name)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  
                  {project.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.4' }}>
                      {project.description}
                    </p>
                  )}
                </div>

                {/* Middle / Calculations Section */}
                <div style={{ marginTop: 'auto' }}>
                  {/* Balance Display */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Balance Neto:</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: project.balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {project.balance >= 0 ? '+' : ''}${project.balance.toLocaleString('es-CO')}
                    </span>
                  </div>

                  {/* Summary Small Text */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}><ArrowUpRight size={12} color="var(--color-success)" /> Aportes: ${project.totalIngresos.toLocaleString('es-CO')}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}><ArrowDownLeft size={12} color="var(--color-danger)" /> Gastos: ${project.totalGastos.toLocaleString('es-CO')}</span>
                  </div>

                  {/* Budget Progress Bar */}
                  {hasBudget && (
                    <div style={{ width: '100%', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: isOverBudget ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                          Prespuesto: {progress}%
                        </span>
                        <span style={{ color: 'var(--color-text-muted)' }}>
                          ${project.totalGastos.toLocaleString('es-CO')} / ${Number(project.budget).toLocaleString('es-CO')}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(progress, 100)}%`,
                            height: '100%',
                            background: progressColor,
                            borderRadius: '3px',
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                      {isOverBudget && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-danger)', marginTop: '0.25rem', textAlign: 'right', fontWeight: 'bold' }}>
                          ⚠️ Excede límite de presupuesto
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* NEW/EDIT PROJECT MODAL */}
      <div className={`modal-overlay ${projectModalOpen ? 'open' : ''}`}>
        <div className="glass-panel modal-content">
          <button className="close-button modal-close--absolute" onClick={handleCloseModal}>
            <X size={20} />
          </button>

          {projectModalOpen && (
            <ProjectForm
              initialData={editingProject}
              onClose={handleCloseModal}
              onSuccess={refetch}
              createProject={createProject}
              updateProject={updateProject}
            />
          )}
        </div>
      </div>

      {/* SQL INSTRUCTIONS MODAL */}
      <div className={`modal-overlay ${sqlModalOpen ? 'open' : ''}`}>
        <div className="glass-panel modal-content" style={{ maxWidth: '600px', width: '90%' }}>
          <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--color-glass-border)', paddingBottom: '0.75rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.15rem' }}>
              <Landmark size={20} color="var(--color-primary)" /> Configurar Tablas de Supabase
            </h3>
            <button className="close-button" onClick={() => setSqlModalOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: '1.4' }}>
            Copia el siguiente script SQL y ejecútalo en la sección <strong>SQL Editor</strong> de tu panel de Supabase para activar la sincronización en la nube:
          </p>

          <div style={{ position: 'relative', background: '#05070f', border: '1px solid var(--color-glass-border)', borderRadius: '8px', padding: '1rem', overflow: 'auto', maxHeight: '250px' }}>
            <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace', color: '#a5b4fc', whiteSpace: 'pre' }}>
              <code>{SQL_SCRIPT}</code>
            </pre>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <button className="glass-button" onClick={() => setSqlModalOpen(false)}>
              Cerrar
            </button>
            <button className="glass-button primary" onClick={copySql}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '¡Copiado!' : 'Copiar Script SQL'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
