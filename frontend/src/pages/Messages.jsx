import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/client'

export default function Messages() {
  const qc = useQueryClient()
  const [params] = useSearchParams()
  const composeId = params.get('compose')
  const composeName = params.get('name')
  const [tab, setTab] = useState(composeId ? 'compose' : 'inbox')
  const [form, setForm] = useState({ receiverId: composeId || '', subject: '', content: '' })
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: () => api.get('/messages').then(r => r.data.data),
  })

  const send = useMutation({
    mutationFn: body => api.post('/messages', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['messages'] }); setForm({ receiverId: '', subject: '', content: '' }); setTab('sent') },
    onError: err => setError(err.response?.data?.message || 'Failed.')
  })

  if (isLoading) return <div className="loading">Loading…</div>

  return (
    <div className="page">
      <h1 className="page-title" style={{ marginBottom: 16 }}>Messages</h1>
      <div className="tab-bar">
        <div className={`tab ${tab === 'inbox' ? 'active' : ''}`} onClick={() => setTab('inbox')}>
          Inbox {data?.unread > 0 && <span className="badge badge-yellow" style={{ marginLeft: 4 }}>{data.unread}</span>}
        </div>
        <div className={`tab ${tab === 'sent' ? 'active' : ''}`} onClick={() => setTab('sent')}>Sent</div>
        <div className={`tab ${tab === 'compose' ? 'active' : ''}`} onClick={() => setTab('compose')}>Compose</div>
      </div>

      {tab === 'inbox' && (
        <div className="card">
          <MsgList msgs={data?.inbox} emptyText="No messages." />
        </div>
      )}

      {tab === 'sent' && (
        <div className="card">
          <MsgList msgs={data?.sent} emptyText="No sent messages." sent />
        </div>
      )}

      {tab === 'compose' && (
        <div className="card" style={{ maxWidth: 560 }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>
            {composeName ? `Message to ${composeName}` : 'New Message'}
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group"><label>Recipient Nation ID</label>
            <input type="number" value={form.receiverId} onChange={e => setForm(f => ({ ...f, receiverId: e.target.value }))} required />
          </div>
          <div className="form-group"><label>Subject</label>
            <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          </div>
          <div className="form-group"><label>Message</label>
            <textarea rows={6} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required />
          </div>
          <button className="btn" onClick={() => { setError(''); send.mutate(form) }} disabled={send.isPending || !form.receiverId || !form.content}>
            {send.isPending ? 'Sending…' : 'Send Message'}
          </button>
        </div>
      )}
    </div>
  )
}

function MsgList({ msgs, emptyText, sent }) {
  if (!msgs?.length) return <div style={{ color: 'var(--text2)', fontSize: 13 }}>{emptyText}</div>
  return (
    <table>
      <thead><tr><th>{sent ? 'To' : 'From'}</th><th>Subject</th><th>Date</th><th></th></tr></thead>
      <tbody>
        {msgs.map(m => (
          <tr key={m.id} style={{ opacity: (!sent && m.read) ? .6 : 1 }}>
            <td>
              <Link to={`/nations/${sent ? m.receiver?.id : m.sender?.id}`}>
                {sent ? m.receiver?.name : m.sender?.name}
              </Link>
            </td>
            <td style={{ fontWeight: !sent && !m.read ? 700 : 400 }}>
              {m.subject || '(no subject)'}
              {!sent && !m.read && <span className="badge badge-blue" style={{ marginLeft: 8 }}>New</span>}
            </td>
            <td style={{ fontSize: 12, color: 'var(--text2)' }}>{new Date(m.sentAt).toLocaleDateString()}</td>
            <td><Link to={`/messages/${m.id}`} className="btn btn-ghost btn-sm">Read</Link></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
