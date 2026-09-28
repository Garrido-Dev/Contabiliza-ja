// ============================================================
// src/pages/ClientForm.jsx
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/layout/Layout';

export default function ClientForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', document: '', whatsapp: '', email: '', address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError('Nome é obrigatório.');
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'clients'), {
        userId: user.uid,
        name: form.name.trim(),
        document: form.document.trim(),
        whatsapp: form.whatsapp.replace(/\D/g, ''),
        email: form.email.trim(),
        address: form.address.trim(),
        createdAt: serverTimestamp(),
      });
      navigate('/clientes');
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="page-header">
        <h2>Novo Cliente</h2>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="form-grid">
          <div className="form-group form-full">
            <label className="form-label">Nome Completo / Razão Social *</label>
            <input name="name" value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">CPF / CNPJ</label>
            <input name="document" value={form.document} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">WhatsApp (com DDD)</label>
            <input name="whatsapp" value={form.whatsapp} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} />
          </div>
          <div className="form-group form-full">
            <label className="form-label">Endereço</label>
            <input name="address" value={form.address} onChange={handleChange} />
          </div>
        </div>

        {error && <p style={{ color: 'var(--red)', marginTop: 16 }}>{error}</p>}

        <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Cliente'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/clientes')}>
            Cancelar
          </button>
        </div>
      </form>
    </Layout>
  );
}
