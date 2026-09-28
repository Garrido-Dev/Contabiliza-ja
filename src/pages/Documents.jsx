// ============================================================
// src/pages/Documents.jsx — GED Contábil (Com aviso "Em Construção")
// ============================================================

import { useState, useEffect, useRef } from 'react';
import {
  collection, query, where, getDocs, addDoc, deleteDoc,
  doc, serverTimestamp, orderBy,
} from 'firebase/firestore';
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
} from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';

const CATEGORIES = [
  'IRPF / Declaração', 'Guia DAS / MEI', 'Balancete', 'Contrato',
  'Extrato Bancário', 'Nota Fiscal', 'Comprovante', 'Outros',
];
const YEARS = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i));

function formatBytes(b) {
  if (!b) return '—';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('pt-BR');
}
function clientName(c) { return c.name || c.nome || 'Cliente'; }
function fileIcon(t) {
  if (!t) return '📎';
  if (t.includes('pdf')) return '📄';
  if (t.includes('image')) return '🖼️';
  if (t.includes('spreadsheet') || t.includes('excel') || t.includes('xls')) return '📊';
  if (t.includes('word') || t.includes('doc')) return '📝';
  return '📎';
}

export default function Documents() {
  const { user } = useAuth();
  const fileInputRef = useRef();

  const [clients, setClients] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [searchClients, setSearchClients] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    category: CATEGORIES[0], year: String(new Date().getFullYear()), name: '',
  });
  const [pendingFile, setPendingFile] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, 'clients'), where('userId', '==', user.uid)))
      .then(s => setClients(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getDocs(query(collection(db, 'documents'), where('userId', '==', user.uid), orderBy('createdAt', 'desc')))
      .then(s => { setDocs(s.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  const visibleDocs = docs.filter(d => {
    if (selectedClient && d.clientId !== selectedClient.id) return false;
    if (selectedYear && d.year !== selectedYear) return false;
    if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
    return true;
  });

  const filteredClients = clients.filter(c =>
    clientName(c).toLowerCase().includes(searchClients.toLowerCase())
  );

  const docCountByClient = clients.reduce((acc, c) => {
    acc[c.id] = docs.filter(d => d.clientId === c.id).length;
    return acc;
  }, {});

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPendingFile(file);
    setUploadForm(p => ({ ...p, name: file.name.replace(/\.[^/.]+$/, '') }));
    setShowUpload(true);
    e.target.value = '';
  }

  async function handleUpload() {
    if (!pendingFile || !selectedClient) return;
    setUploading(true); setUploadProgress(0);
    try {
      const path = `documents/${user.uid}/${selectedClient.id}/${uploadForm.year}/${Date.now()}_${pendingFile.name}`;
      const task = uploadBytesResumable(ref(storage, path), pendingFile);
      await new Promise((ok, err) => task.on('state_changed',
        s => setUploadProgress(Math.round(s.bytesTransferred / s.totalBytes * 100)), err, ok));
      const url = await getDownloadURL(ref(storage, path));
      const docRef = await addDoc(collection(db, 'documents'), {
        userId: user.uid, clientId: selectedClient.id,
        clientName: clientName(selectedClient),
        name: uploadForm.name || pendingFile.name,
        category: uploadForm.category, year: uploadForm.year,
        fileName: pendingFile.name, fileSize: pendingFile.size, fileType: pendingFile.type,
        url, storagePath: path, createdAt: serverTimestamp(),
      });
      setDocs(p => [{
        id: docRef.id, userId: user.uid, clientId: selectedClient.id,
        clientName: clientName(selectedClient), name: uploadForm.name || pendingFile.name,
        category: uploadForm.category, year: uploadForm.year,
        fileName: pendingFile.name, fileSize: pendingFile.size, fileType: pendingFile.type,
        url, storagePath: path,
      }, ...p]);
      setShowUpload(false); setPendingFile(null);
    } catch (e) { alert('Erro: ' + e.message); }
    setUploading(false);
  }

  async function handleDelete(d) {
    if (!confirm(`Excluir "${d.name}"?`)) return;
    try {
      if (d.storagePath) await deleteObject(ref(storage, d.storagePath));
      await deleteDoc(doc(db, 'documents', d.id));
      setDocs(p => p.filter(x => x.id !== d.id));
    } catch (e) { alert('Erro: ' + e.message); }
  }

  async function copyLink(d) {
    await navigator.clipboard.writeText(d.url);
    setCopiedId(d.id); setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <Layout>
      <div className="docs-shell" style={{ position: 'relative', minHeight: 'calc(100vh - 80px)' }}>
        
        {/* ── Overlay: Módulo Em Construção ── */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 50,
          backgroundColor: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '24px',
          borderRadius: '16px'
        }}>
          <div style={{
            fontSize: '56px',
            marginBottom: '16px',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))'
          }}>
            🛠️
          </div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#f8fafc',
            marginBottom: '12px',
            letterSpacing: '-0.5px'
          }}>
            Módulo em Construção
          </h1>
          <p style={{
            fontSize: '15px',
            color: '#94a3b8',
            maxWidth: '460px',
            lineHeight: '1.6',
            marginBottom: '24px'
          }}>
            O módulo de <strong>Gestão de Documentos (GED)</strong> está sendo preparado para permitir o envio e organização de arquivos por cliente e ano.
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#60a5fa',
            padding: '8px 16px',
            borderRadius: '99px',
            fontSize: '13px',
            fontWeight: '500'
          }}>
            <span>🚀</span> Disponível em breve para o Plano Pro
          </div>
        </div>

        {/* ── Conteúdo Original (Preservado e Desfocado ao Fundo) ── */}
        {/* Breadcrumb */}
        <div className="docs-breadcrumb" style={{ opacity: 0.3 }}>
          <button className={`breadcrumb-item${!selectedClient ? ' active' : ''}`}
            onClick={() => { setSelectedClient(null); setSelectedYear(null); }}>
            📁 Todos os Clientes
          </button>
          {selectedClient && (
            <>
              <span className="breadcrumb-sep">›</span>
              <button className={`breadcrumb-item${!selectedYear ? ' active' : ''}`}
                onClick={() => setSelectedYear(null)}>
                {clientName(selectedClient)}
              </button>
            </>
          )}
          {selectedYear && (
            <>
              <span className="breadcrumb-sep">›</span>
              <span className="breadcrumb-item active">{selectedYear}</span>
            </>
          )}
        </div>

        <div className="docs-layout" style={{ opacity: 0.3, pointerEvents: 'none' }}>
          {/* ── Sidebar ── */}
          <aside className="docs-sidebar">
            <div className="docs-sidebar-header">
              <span>Clientes</span>
              <span className="badge-count">{clients.length}</span>
            </div>
            <div className="docs-search">
              <input type="text" placeholder="🔍 Buscar cliente..."
                value={searchClients} onChange={e => setSearchClients(e.target.value)} />
            </div>
            <div className="docs-client-list">
              {filteredClients.map(c => (
                <button key={c.id}
                  className={`docs-client-item${selectedClient?.id === c.id ? ' active' : ''}`}
                  onClick={() => { setSelectedClient(c); setSelectedYear(null); }}>
                  <div className="docs-client-avatar">{clientName(c)[0].toUpperCase()}</div>
                  <div className="docs-client-info">
                    <span className="docs-client-name">{clientName(c)}</span>
                    <span className="docs-client-count">{docCountByClient[c.id] || 0} arquivos</span>
                  </div>
                </button>
              ))}
              {filteredClients.length === 0 && (
                <p style={{ color: 'var(--text-3)', fontSize: 13, padding: '16px', textAlign: 'center' }}>
                  Nenhum cliente
                </p>
              )}
            </div>
          </aside>

          {/* ── Main ── */}
          <div className="docs-main">
            <div className="docs-toolbar">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {selectedClient && (
                  <div className="docs-year-pills">
                    <button className={`year-pill${!selectedYear ? ' active' : ''}`}
                      onClick={() => setSelectedYear(null)}>Todos</button>
                    {YEARS.map(y => (
                      <button key={y} className={`year-pill${selectedYear === y ? ' active' : ''}`}
                        onClick={() => setSelectedYear(y)}>{y}</button>
                    ))}
                  </div>
                )}
                <select className="input" style={{ fontSize: 13, padding: '6px 10px' }}
                  value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                  <option value="all">Todas as categorias</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {selectedClient && (
                <>
                  <input ref={fileInputRef} type="file"
                    accept=".pdf,.xlsx,.xls,.doc,.docx,.jpg,.jpeg,.png,.zip"
                    style={{ display: 'none' }} onChange={handleFileSelect} />
                  <button className="btn btn-primary" onClick={() => fileInputRef.current.click()}>
                    ↑ Enviar Arquivo
                  </button>
                </>
              )}
            </div>

            {selectedClient && (
              <div className="docs-stats-row">
                {[
                  { label: 'Arquivos', value: visibleDocs.length },
                  { label: 'Total', value: formatBytes(visibleDocs.reduce((s, d) => s + (d.fileSize || 0), 0)) },
                  { label: 'Anos', value: [...new Set(visibleDocs.map(d => d.year))].length },
                  { label: 'Categorias', value: [...new Set(visibleDocs.map(d => d.category))].length },
                ].map(s => (
                  <div key={s.label} className="docs-stat-card">
                    <span className="docs-stat-value">{s.value}</span>
                    <span className="docs-stat-label">{s.label}</span>
                  </div>
                ))}
              </div>
            )}

            {loading ? (
              <div className="loading-state">Carregando documentos...</div>
            ) : !selectedClient ? (
              <div className="docs-empty-state">
                <div className="empty-icon">📁</div>
                <h3>Selecione um Cliente</h3>
                <p>Escolha um cliente na barra lateral para visualizar e gerenciar seus documentos.</p>
              </div>
            ) : visibleDocs.length === 0 ? (
              <div className="docs-empty-state">
                <div className="empty-icon">📂</div>
                <h3>Nenhum documento</h3>
                <p>Clique em <strong>Enviar Arquivo</strong> para adicionar o primeiro documento.</p>
              </div>
            ) : (
              <div className="docs-grid">
                {visibleDocs.map(d => (
                  <div key={d.id} className="doc-card">
                    <div className="doc-card-icon">{fileIcon(d.fileType)}</div>
                    <div className="doc-card-body">
                      <div className="doc-card-name" title={d.name}>{d.name}</div>
                      <div className="doc-card-meta">
                        <span className="doc-badge">{d.category}</span>
                        <span>{d.year}</span>
                        <span>{formatBytes(d.fileSize)}</span>
                      </div>
                      <div className="doc-card-date">{formatDate(d.createdAt)}</div>
                    </div>
                    <div className="doc-card-actions">
                      <a href={d.url} target="_blank" rel="noreferrer"
                        className="doc-action-btn" title="Baixar">⬇</a>
                      <button className="doc-action-btn"
                        title={copiedId === d.id ? 'Copiado!' : 'Copiar link'}
                        onClick={() => copyLink(d)}
                        style={{ color: copiedId === d.id ? 'var(--green)' : undefined }}>
                        🔗
                      </button>
                      <button className="doc-action-btn danger" title="Excluir"
                        onClick={() => handleDelete(d)}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal Upload ── */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => !uploading && setShowUpload(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Enviar Arquivo</h3>
              <button className="btn btn-ghost btn-icon"
                onClick={() => !uploading && setShowUpload(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Arquivo</label>
                <div style={{
                  padding: '10px 14px', background: 'var(--bg-3)',
                  borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                  fontSize: 13, color: 'var(--text-2)',
                }}>
                  📎 {pendingFile?.name} ({formatBytes(pendingFile?.size)})
                </div>
              </div>
              <div>
                <label className="form-label">Nome do documento</label>
                <input className="input" value={uploadForm.name}
                  onChange={e => setUploadForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Declaração IRPF 2025" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="form-label">Categoria</label>
                  <select className="input" value={uploadForm.category}
                    onChange={e => setUploadForm(p => ({ ...p, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Ano</label>
                  <select className="input" value={uploadForm.year}
                    onChange={e => setUploadForm(p => ({ ...p, year: e.target.value }))}>
                    {YEARS.map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              {uploading && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span>Enviando...</span><span>{uploadProgress}%</span>
                  </div>
                  <div style={{ background: 'var(--bg-3)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
                    <div style={{
                      width: `${uploadProgress}%`, height: '100%',
                      background: 'var(--blue)', borderRadius: 99, transition: 'width 0.3s',
                    }} />
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowUpload(false)} disabled={uploading}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}