// ============================================================
// src/pages/Settings.jsx
// Configurações do perfil corporativo, dados da empresa/escritório e logotipo.
// Personaliza as propostas e documentos em PDF emitidos.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import imglogoDefault from '../assets/logo.contabilizaJa-branco.png';

// Utilitários de formatação
function formatPhone(v = '') {
  const digits = v.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function formatCnpjCpf(v = '') {
  const digits = v.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

// Redimensiona imagem no navegador para economizar espaço e carregar instantaneamente
function resizeImageToBase64(file, maxDimension = 360) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Settings() {
  const { user, userProfile, profileLoading, updateUserProfile } = useAuth();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    fullName: '',
    officeName: '',
    cnpj: '',
    phone: '',
    email: '',
    roleTitle: '',
    crc: '',
    address: '',
    cityState: '',
    website: '',
    logoUrl: '',
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Carrega dados do perfil quando disponíveis
  useEffect(() => {
    if (userProfile) {
      setForm({
        fullName: userProfile.fullName || user?.displayName || '',
        officeName: userProfile.officeName || '',
        cnpj: userProfile.cnpj ? formatCnpjCpf(userProfile.cnpj) : '',
        phone: userProfile.phone ? formatPhone(userProfile.phone) : '',
        email: userProfile.email || user?.email || '',
        roleTitle: userProfile.roleTitle || '',
        crc: userProfile.crc || '',
        address: userProfile.address || '',
        cityState: userProfile.cityState || '',
        website: userProfile.website || '',
        logoUrl: userProfile.logoUrl || user?.photoURL || '',
      });
    } else if (user) {
      setForm(prev => ({
        ...prev,
        fullName: user.displayName || '',
        email: user.email || '',
        logoUrl: user.photoURL || '',
      }));
    }
  }, [userProfile, user]);

  function handleChange(e) {
    const { name, value } = e.target;
    let formatted = value;
    if (name === 'phone') formatted = formatPhone(value);
    if (name === 'cnpj') formatted = formatCnpjCpf(value);
    setForm(prev => ({ ...prev, [name]: formatted }));
    setSuccessMsg('');
    setErrorMsg('');
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor, selecione um arquivo de imagem válido (PNG, JPG ou SVG).');
      return;
    }

    try {
      const base64 = await resizeImageToBase64(file);
      setForm(prev => ({ ...prev, logoUrl: base64 }));
      setSuccessMsg('Logotipo carregado na prévia! Clique em "Salvar Alterações" para confirmar.');
    } catch (err) {
      console.error(err);
      setErrorMsg('Erro ao processar imagem do logotipo.');
    } finally {
      if (e.target) e.target.value = '';
    }
  }

  function handleRemoveLogo() {
    setForm(prev => ({ ...prev, logoUrl: '' }));
    setSuccessMsg('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await updateUserProfile({
        fullName: form.fullName.trim(),
        officeName: form.officeName.trim(),
        cnpj: form.cnpj.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        roleTitle: form.roleTitle.trim(),
        crc: form.crc.trim(),
        address: form.address.trim(),
        cityState: form.cityState.trim(),
        website: form.website.trim(),
        logoUrl: form.logoUrl || '',
      });
      setSuccessMsg('Configurações salvas com sucesso! Suas propostas e PDFs já estão atualizados.');
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      setErrorMsg('Erro ao salvar as configurações. Verifique sua conexão e tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const previewSubtitle = [
    form.fullName,
    form.roleTitle,
    form.crc,
  ].filter(Boolean).join(' • ') || 'Proposta de Prestação de Serviços';

  return (
    <Layout>
      {/* Cabeçalho da Página */}
      <div className="page-header">
        <div className="header-row">
          <div>
            <h2>⚙️ Configurações & Perfil</h2>
            <p>Personalize os dados da sua empresa ou escritório e a identidade visual das propostas em PDF.</p>
          </div>
        </div>
      </div>

      {profileLoading && (
        <div style={{ color: 'var(--text-3)', marginBottom: '16px', fontSize: '13px' }}>
          Carregando dados da sua conta...
        </div>
      )}

      {/* Alertas */}
      {successMsg && (
        <div
          style={{
            background: 'var(--green-subtle)',
            color: 'var(--green)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            padding: '12px 16px',
            borderRadius: 'var(--radius)',
            marginBottom: '20px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            background: 'var(--red-subtle)',
            color: 'var(--red)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '12px 16px',
            borderRadius: 'var(--radius)',
            marginBottom: '20px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '840px' }}>
        
        {/* Card 1: Identidade Visual e Logotipo */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px' }}>🖼️</span>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Identidade Visual & Logotipo
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '2px 0 0' }}>
                Este logotipo aparecerá no cabeçalho do PDF da proposta comercial e na página de aprovação online.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Box de Prévia do Logo */}
            <div
              style={{
                width: '140px',
                height: '90px',
                borderRadius: 'var(--radius)',
                border: '1px dashed var(--border-light)',
                background: 'var(--bg-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                padding: '6px',
                position: 'relative',
              }}
            >
              {form.logoUrl ? (
                <img
                  src={form.logoUrl}
                  alt="Logo da Empresa"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '11px' }}>
                  <span>Sem Logo</span>
                  <div style={{ fontSize: '9px', opacity: 0.7 }}>(Padrão da plataforma)</div>
                </div>
              )}
            </div>

            {/* Ações de Logo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '220px' }}>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                style={{ display: 'none' }}
                onChange={handleLogoUpload}
              />
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁 Escolher Arquivo de Logo
                </button>
                {form.logoUrl && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={handleRemoveLogo}
                  >
                    🗑️ Remover Logo
                  </button>
                )}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: 0 }}>
                Formatos recomendados: PNG ou JPEG com fundo transparente ou branco. O arquivo é otimizado automaticamente.
              </p>
              
              {/* Opção de URL direta */}
              <div style={{ marginTop: '4px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '3px' }}>
                  Ou informe uma URL direta para a imagem:
                </label>
                <input
                  type="url"
                  name="logoUrl"
                  placeholder="https://exemplo.com/logo.png"
                  value={form.logoUrl}
                  onChange={handleChange}
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Dados da Empresa / Escritório */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px' }}>🏢</span>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Dados da Empresa / Escritório
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '2px 0 0' }}>
                Informações cadastrais e de contato exibidas na proposta para o cliente.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Nome da Empresa / Escritório / Razão Social
              </label>
              <input
                type="text"
                name="officeName"
                placeholder="Ex: Mendes Consultoria, Silva Advocacia, Alpha Soluções..."
                value={form.officeName}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                CNPJ ou CPF
              </label>
              <input
                type="text"
                name="cnpj"
                placeholder="00.000.000/0000-00"
                value={form.cnpj}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Telefone / WhatsApp Comercial
              </label>
              <input
                type="text"
                name="phone"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                E-mail Comercial para Propostas
              </label>
              <input
                type="email"
                name="email"
                placeholder="contato@empresa.com.br"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Website / Redes Sociais (Opcional)
              </label>
              <input
                type="text"
                name="website"
                placeholder="www.suaempresa.com.br"
                value={form.website}
                onChange={handleChange}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Endereço Comercial Completo
              </label>
              <input
                type="text"
                name="address"
                placeholder="Ex: Av. Paulista, 1000, Cj. 42 - Bela Vista, São Paulo - SP"
                value={form.address}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Profissional Responsável */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '20px' }}>👤</span>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                Profissional / Emissor Responsável
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '2px 0 0' }}>
                Identificação da pessoa ou profissional que assina o orçamento.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Nome Completo do Responsável
              </label>
              <input
                type="text"
                name="fullName"
                placeholder="Ex: Carlos Roberto Mendes"
                value={form.fullName}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Cargo / Área (Opcional)
              </label>
              <input
                type="text"
                name="roleTitle"
                placeholder="Ex: Advogado, Consultor, Diretor, Contador..."
                value={form.roleTitle}
                onChange={handleChange}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Registro Profissional / Conselho (Opcional)
              </label>
              <input
                type="text"
                name="crc"
                placeholder="Ex: OAB/SP 123.456, CRC, CREA, CRA..."
                value={form.crc}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Prévia em Tempo Real do Cabeçalho da Proposta */}
        <div className="card" style={{ background: 'var(--bg-3)', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-2)', letterSpacing: '0.5px' }}>
              👁️ Prévia do Cabeçalho nas Propostas & PDFs
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Atualização instantânea</span>
          </div>

          {/* Banner simulando o topo do PDF */}
          <div
            style={{
              background: '#2f7cf6',
              borderRadius: '8px',
              padding: '16px 20px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '54px',
                  height: '42px',
                  background: '#ffffff',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={form.logoUrl || imglogoDefault}
                  alt="Logo"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                  {form.officeName || 'Sua Empresa'}
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)' }}>
                  {previewSubtitle}
                </p>
                {(form.cnpj || form.phone) && (
                  <p style={{ margin: '2px 0 0', fontSize: '10px', color: 'rgba(255, 255, 255, 0.75)' }}>
                    {form.cnpj ? `CNPJ/CPF: ${form.cnpj}` : ''} {form.cnpj && form.phone ? '•' : ''} {form.phone ? `WhatsApp: ${form.phone}` : ''}
                  </p>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: '11px', color: 'rgba(255, 255, 255, 0.9)' }}>
              <div style={{ fontWeight: 700 }}>ORÇAMENTO Nº 8A2F9B01</div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>Emitido em: {new Date().toLocaleDateString('pt-BR')}</div>
            </div>
          </div>
        </div>

        {/* Botão de Salvar Alterações */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
            style={{ padding: '12px 28px', fontSize: '15px' }}
          >
            {saving ? 'Salvando Alterações...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </Layout>
  );
}
