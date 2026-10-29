import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { createWorker } from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import {
  Activity,
  AlertCircle,
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Clock3,
  Database,
  Download,
  FileArchive,
  FileCode2,
  FileJson2,
  FileText,
  Fingerprint,
  FolderOpen,
  Gauge,
  GitBranch,
  Hash,
  Image as ImageIcon,
  Info,
  LayoutDashboard,
  Link2,
  ListFilter,
  LockKeyhole,
  Menu,
  MessageSquareText,
  Network,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Table2,
  Tag,
  Trash2,
  UploadCloud,
  UserRound,
  UsersRound,
  X,
  Zap,
} from 'lucide-react'
import './styles.css'

type Section = 'overview' | 'cases' | 'evidence' | 'timeline' | 'entities' | 'reports'
type CaseStatus = 'active' | 'review' | 'closed'
type Priority = 'critical' | 'high' | 'medium' | 'low'
type RecordOrigin = 'imported' | 'manual' | 'ai-suggested'

type InvestigationCase = {
  id: string
  title: string
  description: string
  category: string
  priority: Priority
  status: CaseStatus
  date: string
  createdAt: string
  fictional: boolean
  notes: string[]
}

type EvidenceItem = {
  id: string
  caseId: string
  name: string
  type: string
  category: string
  size: number
  uploadedAt: string
  description: string
  extractedText: string
  sha256: string
  status: 'processed' | 'metadata-only' | 'error' | 'processing'
  integrity: string
  extractionMethod?: string
  processingMessage?: string
  hashVerification?: 'match' | 'mismatch' | 'unavailable'
  hashVerifiedAt?: string
  sourceType: 'uploaded' | 'manual'
  origin: RecordOrigin
}

type TimelineEvent = {
  id: string
  caseId: string
  timestamp: string
  title: string
  description: string
  source: string
  evidenceId?: string
  category: string
  origin: RecordOrigin
}

type Entity = {
  id: string
  caseId: string
  name: string
  alias: string
  type: 'person' | 'account' | 'device' | 'organization'
  description: string
  relationship: string
  notes: string
  evidenceIds: string[]
  eventIds: string[]
}

type ActivityItem = {
  id: string
  caseId?: string
  time: string
  label: string
  detail: string
  tone: 'cyan' | 'amber' | 'violet' | 'slate'
}

type StoreState = {
  cases: InvestigationCase[]
  evidence: EvidenceItem[]
  events: TimelineEvent[]
  entities: Entity[]
  activity: ActivityItem[]
}

type ModalState =
  | { kind: 'case'; item?: InvestigationCase }
  | { kind: 'event'; item?: TimelineEvent }
  | { kind: 'entity'; item?: Entity }
  | { kind: 'evidence'; item?: EvidenceItem }

type Toast = { message: string; tone: 'success' | 'error' | 'info' }

const STORAGE_KEY = 'trace-investigation-state-v1'
const now = new Date()
const ago = (days: number, hours = 0) => new Date(now.getTime() - (days * 24 + hours) * 3600000).toISOString()

const demoState: StoreState = {
  cases: [
    {
      id: 'TRC-24017',
      title: 'Suspicious Account Access',
      description: 'Review a burst of successful sign-ins and unfamiliar device fingerprints attached to a finance workspace.',
      category: 'Account compromise',
      priority: 'high',
      status: 'active',
      date: '2026-10-24',
      createdAt: ago(4),
      fictional: true,
      notes: ['Demonstration case. Confirm source logs before drawing conclusions.', 'Focus review on the 02:00–03:00 UTC authentication window.'],
    },
    {
      id: 'TRC-24012',
      title: 'Suspected Data Exfiltration',
      description: 'Map a simulated sequence of archive creation, cloud sync and outbound transfer events from a research laptop.',
      category: 'Data movement',
      priority: 'critical',
      status: 'review',
      date: '2026-10-21',
      createdAt: ago(7),
      fictional: true,
      notes: ['Demonstration case. Archive names are synthetic and contain no real data.'],
    },
    {
      id: 'TRC-24006',
      title: 'Digital Identity Fraud',
      description: 'Compare synthetic onboarding records, recovery requests and device signals for an identity review.',
      category: 'Identity',
      priority: 'medium',
      status: 'closed',
      date: '2026-10-18',
      createdAt: ago(10),
      fictional: true,
      notes: ['Closed for demo: the evidence gap is intentionally left visible in the report.'],
    },
  ],
  evidence: [
    { id: 'EV-881', caseId: 'TRC-24017', name: 'auth_gateway_2026-10-24.log', type: 'LOG', category: 'Authentication', size: 248000, uploadedAt: ago(3, 2), description: 'Synthetic gateway authentication events for the review window.', extractedText: '2026-10-24T02:14:09Z SUCCESS user=alina device=MBP-7F2 ip=198.51.100.24\n2026-10-24T02:16:44Z SUCCESS user=alina device=WIN-41AC ip=203.0.113.18\n2026-10-24T02:18:02Z MFA_CHALLENGE user=alina method=push result=approved', sha256: '8c2f…a19d', status: 'processed', integrity: 'Hash recorded · source preserved', sourceType: 'uploaded', origin: 'imported' },
    { id: 'EV-882', caseId: 'TRC-24017', name: 'device_fingerprint.csv', type: 'CSV', category: 'Endpoint', size: 18400, uploadedAt: ago(3, 4), description: 'Synthetic device and browser fingerprint comparison.', extractedText: 'device_id,first_seen,os,confidence\nWIN-41AC,2026-10-24T02:16:44Z,Windows 11,0.42\nMBP-7F2,2026-08-02T09:10:13Z,macOS,0.98', sha256: '41bd…0ce4', status: 'processed', integrity: 'Hash recorded · source preserved', sourceType: 'uploaded', origin: 'imported' },
    { id: 'EV-771', caseId: 'TRC-24012', name: 'archive_manifest.json', type: 'JSON', category: 'File system', size: 42100, uploadedAt: ago(6, 2), description: 'Synthetic manifest of an archive operation.', extractedText: '{\n  "archive": "research_q3.zip",\n  "created_at": "2026-10-21T19:42:11Z",\n  "file_count": 1842,\n  "destination": "cloud-sync-sim"\n}', sha256: 'c90d…f2aa', status: 'processed', integrity: 'Hash recorded · source preserved', sourceType: 'uploaded', origin: 'imported' },
    { id: 'EV-772', caseId: 'TRC-24012', name: 'sync_agent_events.txt', type: 'TXT', category: 'Network', size: 9200, uploadedAt: ago(6, 5), description: 'Manual export from the fictional sync agent.', extractedText: '19:44:03 upload started destination=cloud-sync-sim\n19:47:58 transfer paused reason=token_refresh\n19:52:30 upload resumed bytes=18420392', sha256: 'b47a…c212', status: 'processed', integrity: 'Hash recorded · source preserved', sourceType: 'uploaded', origin: 'imported' },
    { id: 'EV-663', caseId: 'TRC-24006', name: 'recovery_request.pdf', type: 'PDF', category: 'Identity', size: 650000, uploadedAt: ago(9), description: 'Seeded demonstration record; the original PDF bytes are not included. Re-upload the source file to run extraction.', extractedText: '', sha256: '2d81…c12b', status: 'metadata-only', integrity: 'Demo metadata only · original file unavailable', sourceType: 'uploaded', origin: 'imported' },
    { id: 'EV-664', caseId: 'TRC-24006', name: 'identity_review_note', type: 'NOTE', category: 'Investigator note', size: 0, uploadedAt: ago(8), description: 'Manual note: recovery phone and account region require independent verification.', extractedText: 'Manual note: recovery phone and account region require independent verification.', sha256: 'manual entry', status: 'processed', integrity: 'Manually entered · no file hash', sourceType: 'manual', origin: 'manual' },
  ],
  events: [
    { id: 'TE-1001', caseId: 'TRC-24017', timestamp: '2026-10-24T02:14:09Z', title: 'Known device sign-in', description: 'Successful sign-in from the established MBP-7F2 device.', source: 'auth_gateway_2026-10-24.log', evidenceId: 'EV-881', category: 'Authentication', origin: 'imported' },
    { id: 'TE-1002', caseId: 'TRC-24017', timestamp: '2026-10-24T02:16:44Z', title: 'New device sign-in', description: 'A second successful sign-in appears two minutes after the known device event.', source: 'auth_gateway_2026-10-24.log', evidenceId: 'EV-881', category: 'Authentication', origin: 'imported' },
    { id: 'TE-1003', caseId: 'TRC-24017', timestamp: '2026-10-24T02:18:02Z', title: 'MFA challenge approved', description: 'A push challenge was marked approved; approval context is not available in the imported log.', source: 'auth_gateway_2026-10-24.log', evidenceId: 'EV-881', category: 'Access control', origin: 'imported' },
    { id: 'TE-2001', caseId: 'TRC-24012', timestamp: '2026-10-21T19:42:11Z', title: 'Archive manifest created', description: 'The manifest records a synthetic archive with 1,842 files.', source: 'archive_manifest.json', evidenceId: 'EV-771', category: 'File system', origin: 'imported' },
    { id: 'TE-2002', caseId: 'TRC-24012', timestamp: '2026-10-21T19:44:03Z', title: 'Sync transfer started', description: 'A sync agent reported the start of an upload to the simulated destination.', source: 'sync_agent_events.txt', evidenceId: 'EV-772', category: 'Network', origin: 'imported' },
    { id: 'TE-2003', caseId: 'TRC-24012', timestamp: '2026-10-21T19:47:58Z', title: 'Transfer paused', description: 'The transfer paused for a token refresh. This is an observed log state, not intent.', source: 'sync_agent_events.txt', evidenceId: 'EV-772', category: 'Network', origin: 'imported' },
    { id: 'TE-3001', caseId: 'TRC-24006', timestamp: '2026-10-18T10:03:00Z', title: 'Recovery request received', description: 'A synthetic identity recovery request entered the review queue.', source: 'recovery_request.pdf', evidenceId: 'EV-663', category: 'Identity', origin: 'imported' },
    { id: 'TE-3002', caseId: 'TRC-24006', timestamp: '2026-10-18T14:30:00Z', title: 'Verification gap noted', description: 'Investigator recorded a gap requiring independent verification.', source: 'identity_review_note', evidenceId: 'EV-664', category: 'Review', origin: 'manual' },
  ],
  entities: [
    { id: 'EN-01', caseId: 'TRC-24017', name: 'Alina Reyes', alias: 'alina.r', type: 'person', description: 'Account owner listed in synthetic authentication records.', relationship: 'account owner', notes: 'Association recorded from account field; no conclusion about activity.', evidenceIds: ['EV-881', 'EV-882'], eventIds: ['TE-1001', 'TE-1002', 'TE-1003'] },
    { id: 'EN-02', caseId: 'TRC-24017', name: 'WIN-41AC', alias: 'unfamiliar device', type: 'device', description: 'Device identifier first observed during the review window.', relationship: 'observed endpoint', notes: 'Device presence does not establish who operated it.', evidenceIds: ['EV-881', 'EV-882'], eventIds: ['TE-1002'] },
    { id: 'EN-03', caseId: 'TRC-24012', name: 'cloud-sync-sim', alias: 'destination', type: 'organization', description: 'Synthetic destination used by the sample sync agent.', relationship: 'transfer destination', notes: 'Fictional environment only.', evidenceIds: ['EV-771', 'EV-772'], eventIds: ['TE-2002', 'TE-2003'] },
    { id: 'EN-04', caseId: 'TRC-24006', name: 'Recovery profile', alias: 'profile-42', type: 'account', description: 'Synthetic account profile referenced in the recovery workflow.', relationship: 'recorded profile', notes: 'Identity matching remains unresolved.', evidenceIds: ['EV-663', 'EV-664'], eventIds: ['TE-3001', 'TE-3002'] },
  ],
  activity: [
    { id: 'AC-01', caseId: 'TRC-24017', time: ago(0, 2), label: 'Evidence indexed', detail: 'device_fingerprint.csv is ready for review', tone: 'cyan' },
    { id: 'AC-02', caseId: 'TRC-24017', time: ago(0, 5), label: 'Timeline event imported', detail: 'New device sign-in mapped to TRC-24017', tone: 'violet' },
    { id: 'AC-03', caseId: 'TRC-24012', time: ago(1, 3), label: 'Case moved to review', detail: 'Suspected Data Exfiltration awaits human review', tone: 'amber' },
    { id: 'AC-04', caseId: 'TRC-24006', time: ago(2, 1), label: 'Investigator note added', detail: 'Verification gap recorded on recovery profile', tone: 'slate' },
    { id: 'AC-05', time: ago(3), label: 'Demo workspace restored', detail: 'Seeded fictional environment is available', tone: 'cyan' },
  ],
}

const navItems: { id: Section; label: string; icon: LucideIcon; hint: string }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, hint: 'Command center' },
  { id: 'cases', label: 'Cases', icon: FolderOpen, hint: 'Manage investigations' },
  { id: 'evidence', label: 'Evidence lab', icon: Fingerprint, hint: 'Inspect source material' },
  { id: 'timeline', label: 'Timeline', icon: Clock3, hint: 'Reconstruct events' },
  { id: 'entities', label: 'Entities', icon: Network, hint: 'Map associations' },
  { id: 'reports', label: 'Reports', icon: ClipboardList, hint: 'Export findings' },
]

function cloneDemo(): StoreState {
  return JSON.parse(JSON.stringify(demoState)) as StoreState
}

function loadState(): StoreState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as StoreState
  } catch {
    // Fall through to a clean demo workspace if browser storage is unavailable.
  }
  return cloneDemo()
}

function formatRelative(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
}

function formatDateTimeInput(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function titleCase(value: string) {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char] || char))
}

function demoResponse(prompt: string, currentCase: InvestigationCase | undefined, evidence: EvidenceItem[], events: TimelineEvent[]) {
  const firstEvidence = evidence[0]
  const timestamp = events[0]?.timestamp ? formatDateTime(events[0].timestamp) : 'No timestamp found in the current evidence set'
  return `DEMONSTRATION MODE · deterministic workspace guidance\n\nOBSERVED SIGNALS\n• ${currentCase?.title || 'The active case'} currently has ${evidence.length} linked evidence item${evidence.length === 1 ? '' : 's'} and ${events.length} recorded timeline event${events.length === 1 ? '' : 's'}.\n• ${firstEvidence ? `${firstEvidence.name} is marked ${firstEvidence.status}; its source state is ${firstEvidence.integrity.toLowerCase()}.` : 'No evidence is linked to this case yet.'}\n• The earliest recorded event is ${timestamp}. This is a source timestamp or manual entry, not an AI-generated time.\n\nHYPOTHESIS TO REVIEW\nThe prompt “${prompt}” may warrant comparing authentication, endpoint and timeline records for consistency. This is an AI-style suggestion based on seeded demonstration data, not a confirmed finding.\n\nNEXT STEPS\n1. Confirm that the source files are complete and independently preserved.\n2. Compare the relevant identifier across at least two evidence items.\n3. Record what remains unknown before changing the case status.\n\nUNCERTAINTY\nTRACE has not established who performed any action, intent, attribution, or legal significance. Human review is required.`
}

function App() {
  const [view, setView] = useState<'landing' | 'workspace'>(() => window.location.pathname.startsWith('/workspace') ? 'workspace' : 'landing')
  const [section, setSection] = useState<Section>('overview')
  const [state, setState] = useState<StoreState>(loadState)
  const [activeCaseId, setActiveCaseId] = useState('TRC-24017')
  const [query, setQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'priority' | 'title'>('newest')
  const [statusFilter, setStatusFilter] = useState<'all' | CaseStatus>('all')
  const [toast, setToast] = useState<Toast | null>(null)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null)
  const [aiPrompt, setAiPrompt] = useState('Summarize the active investigation and flag the most important review gaps.')
  const [aiResult, setAiResult] = useState('')
  const [aiResultMode, setAiResultMode] = useState<'live' | 'demo' | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [utilityPanel, setUtilityPanel] = useState<'notifications' | 'profile' | 'settings' | null>(null)
  const [reduceMotion, setReduceMotion] = useState(() => {
    try { return window.localStorage.getItem('trace-reduce-motion') === 'true' } catch { return false }
  })
  const [evidenceFilter, setEvidenceFilter] = useState('all')
  const [evidenceCategoryFilter, setEvidenceCategoryFilter] = useState('all')
  const [timelineFilter, setTimelineFilter] = useState('all')
  const [noteDraft, setNoteDraft] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const verifyFileInputRef = useRef<HTMLInputElement>(null)
  const verifyTargetRef = useRef<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* Browser storage may be disabled; the live session still works. */ }
  }, [state])

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reduceMotion)
    try { window.localStorage.setItem('trace-reduce-motion', String(reduceMotion)) } catch { /* Preferences remain available for this session. */ }
  }, [reduceMotion])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (view !== 'workspace') launchWorkspace('cases')
        else setSection('cases')
        window.setTimeout(() => searchInputRef.current?.focus(), 60)
      }
      if (event.key === 'Escape') {
        setUtilityPanel(null)
        setMobileNavOpen(false)
        if (modal) setModal(null)
      }
    }
    const onPopState = () => {
      setView(window.location.pathname.startsWith('/workspace') ? 'workspace' : 'landing')
      setUtilityPanel(null)
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return
      if (!event.target.closest('.utility-panel, [data-utility-trigger]')) setUtilityPanel(null)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('popstate', onPopState)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('popstate', onPopState)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [view, modal])

  const activeCase = state.cases.find((item) => item.id === activeCaseId) || state.cases[0]
  const activeEvidence = state.evidence.filter((item) => item.caseId === activeCase?.id)
  const activeEvents = state.events.filter((item) => item.caseId === activeCase?.id).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const activeEntities = state.entities.filter((item) => item.caseId === activeCase?.id)
  const activeActivity = state.activity.filter((item) => !item.caseId || item.caseId === activeCase?.id)

  const stats = useMemo(() => ({
    cases: state.cases.length,
    active: state.cases.filter((item) => item.status === 'active').length,
    review: state.cases.filter((item) => item.status === 'review').length,
    evidence: state.evidence.length,
    events: state.events.length,
    entities: state.entities.length,
  }), [state])

  function notify(message: string, tone: Toast['tone'] = 'success') {
    setToast({ message, tone })
    window.setTimeout(() => setToast(null), 3600)
  }

  function updateState(updater: (current: StoreState) => StoreState) {
    setState((current) => updater(current))
  }

  function launchWorkspace(nextSection: Section = 'overview') {
    setView('workspace')
    setSection(nextSection)
    setUtilityPanel(null)
    if (window.location.pathname !== '/workspace') window.history.pushState({}, '', '/workspace')
  }

  function selectCase(id: string, nextSection: Section = 'cases') {
    if (id !== activeCaseId) { setAiResult(''); setAiResultMode(null); setAiError(''); setAiPrompt('Summarize the active investigation and flag the most important review gaps.') }
    setActiveCaseId(id)
    setSection(nextSection)
    setView('workspace')
    setUtilityPanel(null)
    setMobileNavOpen(false)
    if (window.location.pathname !== '/workspace') window.history.pushState({}, '', '/workspace')
  }

  function addActivity(label: string, detail: string, caseId?: string, tone: ActivityItem['tone'] = 'cyan') {
    const activity: ActivityItem = { id: `AC-${Date.now()}`, caseId, time: new Date().toISOString(), label, detail, tone }
    updateState((current) => ({ ...current, activity: [activity, ...current.activity].slice(0, 16) }))
  }

  function saveCase(form: Record<string, string>, existing?: InvestigationCase) {
    const title = form.title?.trim()
    if (!title || !form.category || !form.date) return notify('Add a title, category and incident date before saving.', 'error')
    const item: InvestigationCase = {
      id: existing?.id || `TRC-${Math.floor(24030 + Math.random() * 60)}`,
      title,
      description: form.description?.trim() || 'No case description provided yet.',
      category: form.category,
      priority: (form.priority as Priority) || 'medium',
      status: (form.status as CaseStatus) || 'active',
      date: form.date,
      createdAt: existing?.createdAt || new Date().toISOString(),
      fictional: true,
      notes: existing?.notes || [],
    }
    updateState((current) => ({ ...current, cases: existing ? current.cases.map((entry) => entry.id === existing.id ? item : entry) : [item, ...current.cases] }))
    setActiveCaseId(item.id)
    if (!existing) { setAiResult(''); setAiResultMode(null); setAiError('') }
    setModal(null)
    addActivity(existing ? 'Case details updated' : 'New case created', item.title, item.id, 'cyan')
    notify(existing ? 'Case details saved.' : 'New fictional case created.')
  }

  function deleteCase(item: InvestigationCase) {
    if (!window.confirm(`Delete ${item.title}? Its linked demo records will also be removed.`)) return
    const remaining = state.cases.filter((entry) => entry.id !== item.id)
    updateState((current) => ({
      ...current,
      cases: remaining,
      evidence: current.evidence.filter((entry) => entry.caseId !== item.id),
      events: current.events.filter((entry) => entry.caseId !== item.id),
      entities: current.entities.filter((entry) => entry.caseId !== item.id),
    }))
    const nextId = remaining[0]?.id || ''
    setActiveCaseId(nextId)
    setAiResult('')
    setAiResultMode(null)
    setAiError('')
    notify('Case and linked records deleted.', 'info')
  }

  function addNote() {
    const text = noteDraft.trim()
    if (!text || !activeCase) return
    updateState((current) => ({ ...current, cases: current.cases.map((item) => item.id === activeCase.id ? { ...item, notes: [...item.notes, text] } : item) }))
    addActivity('Investigator note added', text, activeCase.id, 'slate')
    setNoteDraft('')
    notify('Note added to the case record.')
  }

  async function sha256(file: File) {
    try {
      if (!window.crypto?.subtle) return 'hash unavailable in this browser'
      const buffer = await file.arrayBuffer()
      const digest = await window.crypto.subtle.digest('SHA-256', buffer)
      return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
    } catch {
      return 'hash unavailable in this browser'
    }
  }

  async function verifyEvidenceHash(file: File) {
    const targetId = verifyTargetRef.current
    verifyTargetRef.current = null
    if (!targetId) return
    const evidence = state.evidence.find((item) => item.id === targetId)
    if (!evidence) return notify('Evidence record could not be found.', 'error')
    if (!/^[a-f0-9]{64}$/i.test(evidence.sha256)) return notify('This record does not contain a full SHA-256 hash. Re-upload the original file to create a verifiable hash.', 'error')
    const calculated = await sha256(file)
    if (calculated.startsWith('hash unavailable')) {
      updateState((current) => ({ ...current, evidence: current.evidence.map((item) => item.id === targetId ? { ...item, hashVerification: 'unavailable', hashVerifiedAt: new Date().toISOString() } : item) }))
      return notify('Hash comparison unavailable in this browser.', 'error')
    }
    const match = calculated === evidence.sha256
    updateState((current) => ({ ...current, evidence: current.evidence.map((item) => item.id === targetId ? { ...item, hashVerification: match ? 'match' : 'mismatch', hashVerifiedAt: new Date().toISOString() } : item) }))
    notify(match ? 'Hash match: selected file matches the stored SHA-256 hash.' : 'Hash mismatch: selected file differs from the stored SHA-256 hash.', match ? 'success' : 'error')
  }

  async function extractWithOCR(source: File | HTMLCanvasElement) {
    const worker = await createWorker('eng')
    try {
      const result = await worker.recognize(source)
      return (result.data.text || '').trim()
    } finally {
      await worker.terminate()
    }
  }

  async function extractPdf(file: File) {
    const pdfjs = pdfjsLib
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
    const data = new Uint8Array(await file.arrayBuffer())
    const document = await pdfjs.getDocument({ data }).promise
    const totalPages = document.numPages
    const pageCount = Math.min(totalPages, 30)
    const chunks: string[] = []
    const warnings: string[] = []
    let ocrWorker: Awaited<ReturnType<typeof createWorker>> | null = null

    try {
      for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        const page = await document.getPage(pageNumber)
        const content = await page.getTextContent()
        const text = content.items
          .map((item) => ('str' in item ? String(item.str || '') : ''))
          .filter(Boolean)
          .join(' ')
          .trim()

        if (text.length > 0) {
          chunks.push(`--- Page ${pageNumber} ---\n${text}`)
          continue
        }

        try {
          const viewport = page.getViewport({ scale: 1.5 })
          const canvas = window.document.createElement('canvas')
          const context = canvas.getContext('2d')
          if (!context) throw new Error('Canvas is unavailable in this browser.')
          canvas.width = Math.ceil(viewport.width)
          canvas.height = Math.ceil(viewport.height)
          await page.render({ canvasContext: context, viewport }).promise
          if (!ocrWorker) ocrWorker = await createWorker('eng')
          const result = await ocrWorker.recognize(canvas)
          const pageText = (result.data.text || '').trim()
          if (pageText) chunks.push(`--- Page ${pageNumber} (OCR) ---\n${pageText}`)
          else warnings.push(`Page ${pageNumber}: no readable text detected`)
          canvas.width = 0
          canvas.height = 0
        } catch {
          warnings.push(`Page ${pageNumber}: OCR could not process this page`)
        }
      }
    } finally {
      if (ocrWorker) await ocrWorker.terminate()
      await document.destroy()
    }

    if (totalPages > pageCount) warnings.push(`Only the first ${pageCount} pages were processed (30-page limit).`)
    return { text: chunks.join('\n\n').slice(0, 50000), warnings }
  }

  async function extractFileContent(file: File, extension: string) {
    const supportedImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(extension)
    const supportedText = ['txt', 'log', 'csv', 'json', 'md', 'xml', 'html'].includes(extension) || file.type.startsWith('text/')
    if (!file.size) return { text: '', method: 'None', status: 'metadata-only' as const, message: 'File is empty; there is no content to extract.' }
    if (file.size > 15_000_000) return { text: '', method: 'None', status: 'metadata-only' as const, message: 'File exceeds the 15 MB processing limit.' }

    if (supportedText) {
      const text = (await file.text()).slice(0, 50000)
      if (!text.trim()) return { text: '', method: 'Text parser', status: 'metadata-only' as const, message: 'No readable text detected in this file.' }
      if (extension === 'json') {
        try { JSON.parse(text) } catch { return { text, method: 'Text parser', status: 'processed' as const, message: 'Text extracted; JSON syntax validation failed. Review the raw content.' } }
      }
      return { text, method: 'Text parser', status: 'processed' as const, message: text.length >= 50000 ? 'Text extracted; display limited to the first 50,000 characters.' : 'Text extraction completed successfully.' }
    }

    if (supportedImage) {
      try {
        const text = await extractWithOCR(file)
        return text
          ? { text: text.slice(0, 50000), method: 'OCR (Tesseract.js)', status: 'processed' as const, message: 'OCR completed successfully. Verify extracted text against the original image.' }
          : { text: '', method: 'OCR (Tesseract.js)', status: 'metadata-only' as const, message: 'No readable text detected by OCR. The image may contain no text or the text may be unclear.' }
      } catch (error) {
        return { text: '', method: 'OCR (Tesseract.js)', status: 'error' as const, message: `OCR failed: ${error instanceof Error ? error.message : 'Unknown OCR error'}` }
      }
    }

    if (extension === 'pdf' || file.type === 'application/pdf') {
      try {
        const result = await extractPdf(file)
        if (!result.text.trim()) {
          const warning = result.warnings.length ? ` ${result.warnings.join('; ')}.` : ''
          return { text: '', method: 'PDF text extraction + OCR', status: 'metadata-only' as const, message: `No readable text detected in this PDF.${warning}` }
        }
        return { text: result.text, method: 'PDF text extraction + OCR', status: 'processed' as const, message: result.warnings.length ? `Extraction completed with warnings: ${result.warnings.join('; ')}.` : 'PDF extraction completed successfully.' }
      } catch (error) {
        return { text: '', method: 'PDF text extraction + OCR', status: 'error' as const, message: `PDF processing failed: ${error instanceof Error ? error.message : 'The file may be corrupted or encrypted.'}` }
      }
    }

    return { text: '', method: 'Not supported', status: 'metadata-only' as const, message: `Content extraction is not supported for .${extension || 'unknown'} files. Supported formats: JPG, PNG, WEBP, PDF, TXT, LOG, CSV, JSON, MD, XML and HTML.` }
  }

  async function processFiles(files: FileList | File[]) {
    const chosenFiles = Array.from(files).slice(0, 8)
    if (!chosenFiles.length) return
    const newIds: string[] = []

    for (const file of chosenFiles) {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'file'
      const supportedImage = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(extension)
      const id = `EV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 899)}`
      const hash = await sha256(file)
      const initial: EvidenceItem = {
        id,
        caseId: activeCase?.id || '',
        name: file.name,
        type: extension.toUpperCase(),
        category: supportedImage ? 'Image evidence' : extension === 'json' || extension === 'csv' ? 'Structured data' : 'Imported file',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        description: `Processing uploaded ${extension.toUpperCase()} evidence.`,
        extractedText: '',
        sha256: hash,
        status: 'processing',
        integrity: hash.startsWith('hash unavailable') ? 'Hash unavailable in this browser' : 'SHA-256 hash recorded',
        extractionMethod: 'Pending',
        processingMessage: 'Validating file and extracting content…',
        sourceType: 'uploaded',
        origin: 'imported',
      }
      newIds.push(id)
      updateState((current) => ({ ...current, evidence: [initial, ...current.evidence] }))

      try {
        const result = await extractFileContent(file, extension)
        updateState((current) => ({
          ...current,
          evidence: current.evidence.map((item) => item.id === id ? {
            ...item,
            extractedText: result.text,
            status: result.status,
            description: result.message,
            integrity: result.status === 'processed'
              ? (item.sha256.startsWith('hash unavailable') ? 'Content extracted · hash unavailable' : 'Content extracted · SHA-256 hash recorded')
              : result.status === 'error' ? 'Processing failed · metadata retained' : 'Metadata retained · no readable content extracted',
            extractionMethod: result.method,
            processingMessage: result.message,
          } : item),
        }))
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected processing error.'
        updateState((current) => ({
          ...current,
          evidence: current.evidence.map((item) => item.id === id ? {
            ...item,
            status: 'error',
            description: message,
            integrity: 'Processing failed · metadata retained',
            extractionMethod: 'Processing error',
            processingMessage: message,
          } : item),
        }))
      }
    }

    setSelectedEvidenceId(newIds[0])
    addActivity('Evidence added', `${newIds.length} file${newIds.length === 1 ? '' : 's'} added to ${activeCase?.id || 'case'}`, activeCase?.id, 'cyan')
    notify(`${newIds.length} evidence item${newIds.length === 1 ? '' : 's'} processed. Review each extraction status.`)
  }

  function handleVerifyFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) void verifyEvidenceHash(file)
    event.target.value = ''
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void processFiles(event.target.files)
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (event.dataTransfer.files.length) void processFiles(event.dataTransfer.files)
  }

  function saveEvidence(form: Record<string, string>, existing?: EvidenceItem) {
    if (!form.name?.trim() || !activeCase) return notify('Add a name and choose an active case before saving.', 'error')
    const item: EvidenceItem = {
      id: existing?.id || `EV-${Math.floor(100 + Math.random() * 890)}`,
      caseId: form.caseId || activeCase.id,
      name: form.name.trim(),
      type: form.type?.toUpperCase() || 'NOTE',
      category: form.category || 'Investigator note',
      size: existing?.size || 0,
      uploadedAt: existing?.uploadedAt || new Date().toISOString(),
      description: form.description?.trim() || 'Manual evidence description.',
      extractedText: form.extractedText?.trim() || form.description?.trim() || '',
      sha256: existing?.sha256 || 'manual entry',
      status: existing?.status || 'processed',
      integrity: existing?.integrity || 'Manually entered · no file hash',
      sourceType: existing?.sourceType || 'manual',
      origin: existing?.origin || 'manual',
    }
    updateState((current) => ({ ...current, evidence: existing ? current.evidence.map((entry) => entry.id === existing.id ? item : entry) : [item, ...current.evidence] }))
    setSelectedEvidenceId(item.id)
    setModal(null)
    notify(existing ? 'Evidence record updated.' : 'Manual evidence record added.')
  }

  function deleteEvidence(item: EvidenceItem) {
    if (!window.confirm(`Remove ${item.name} from this case?`)) return
    updateState((current) => ({ ...current, evidence: current.evidence.filter((entry) => entry.id !== item.id), events: current.events.map((event) => event.evidenceId === item.id ? { ...event, evidenceId: undefined } : event), entities: current.entities.map((entity) => ({ ...entity, evidenceIds: entity.evidenceIds.filter((id) => id !== item.id) })) }))
    setSelectedEvidenceId(null)
    notify('Evidence record removed.', 'info')
  }

  function saveEvent(form: Record<string, string>, existing?: TimelineEvent) {
    if (!activeCase || !form.title?.trim() || !form.timestamp) return notify('Add an event title and timestamp before saving.', 'error')
    const parsedTimestamp = new Date(form.timestamp)
    if (Number.isNaN(parsedTimestamp.getTime())) return notify('Enter a valid event timestamp before saving.', 'error')
    const timestamp = existing && form.timestamp === formatDateTimeInput(existing.timestamp) ? existing.timestamp : parsedTimestamp.toISOString()
    const item: TimelineEvent = {
      id: existing?.id || `TE-${Math.floor(1000 + Math.random() * 8000)}`,
      caseId: form.caseId || activeCase.id,
      timestamp,
      title: form.title.trim(),
      description: form.description?.trim() || 'No event description provided.',
      source: form.source?.trim() || 'Manual investigator entry',
      evidenceId: form.evidenceId || undefined,
      category: form.category || 'Review',
      origin: (form.origin as RecordOrigin) || 'manual',
    }
    updateState((current) => ({ ...current, events: existing ? current.events.map((entry) => entry.id === existing.id ? item : entry) : [...current.events, item].sort((a, b) => a.timestamp.localeCompare(b.timestamp)) }))
    setModal(null)
    addActivity(existing ? 'Timeline event updated' : 'Timeline event added', item.title, item.caseId, item.origin === 'ai-suggested' ? 'violet' : 'cyan')
    notify(existing ? 'Timeline event updated.' : 'Timeline event added.')
  }

  function deleteEvent(item: TimelineEvent) {
    if (!window.confirm(`Delete the event “${item.title}”?`)) return
    updateState((current) => ({ ...current, events: current.events.filter((entry) => entry.id !== item.id), entities: current.entities.map((entity) => ({ ...entity, eventIds: entity.eventIds.filter((id) => id !== item.id) })) }))
    notify('Timeline event deleted.', 'info')
  }

  function saveEntity(form: Record<string, string>, existing?: Entity) {
    if (!activeCase || !form.name?.trim()) return notify('Add an entity name before saving.', 'error')
    const item: Entity = {
      id: existing?.id || `EN-${Math.floor(10 + Math.random() * 90)}`,
      caseId: form.caseId || activeCase.id,
      name: form.name.trim(),
      alias: form.alias?.trim() || 'unassigned alias',
      type: (form.type as Entity['type']) || 'person',
      description: form.description?.trim() || 'No description provided.',
      relationship: form.relationship?.trim() || 'recorded association',
      notes: form.notes?.trim() || 'Association requires human review.',
      evidenceIds: form.evidenceIds ? form.evidenceIds.split(',').map((id) => id.trim()).filter(Boolean) : existing?.evidenceIds || [],
      eventIds: form.eventIds ? form.eventIds.split(',').map((id) => id.trim()).filter(Boolean) : existing?.eventIds || [],
    }
    updateState((current) => ({ ...current, entities: existing ? current.entities.map((entry) => entry.id === existing.id ? item : entry) : [item, ...current.entities] }))
    setModal(null)
    notify(existing ? 'Entity profile updated.' : 'Entity profile created.')
  }

  function deleteEntity(item: Entity) {
    if (!window.confirm(`Delete the profile for ${item.name}?`)) return
    updateState((current) => ({ ...current, entities: current.entities.filter((entry) => entry.id !== item.id) }))
    notify('Entity profile deleted.', 'info')
  }

  async function askAssistant() {
    if (!activeCase || !aiPrompt.trim()) return
    setAiLoading(true)
    setAiError('')
    setAiResult('')
    setAiResultMode(null)
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: aiPrompt.trim() }],
          context: { case: activeCase, evidence: activeEvidence.map(({ id, name, type, extractedText, status }) => ({ id, name, type, extractedText, status })), events: activeEvents, entities: activeEntities },
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok && data.mode !== 'error' && data.content) {
        setAiResult(data.content)
        setAiResultMode('live')
      } else {
        setAiResult(demoResponse(aiPrompt, activeCase, activeEvidence, activeEvents))
        setAiResultMode('demo')
        notify('Live analysis is unavailable; clearly labeled local demonstration guidance is shown instead.', 'info')
      }
    } catch {
      setAiResult(demoResponse(aiPrompt, activeCase, activeEvidence, activeEvents))
      setAiResultMode('demo')
      notify('Live analysis is unavailable; clearly labeled local demonstration guidance is shown instead.', 'info')
    } finally {
      setAiLoading(false)
    }
  }

  function generateReport() {
    if (!activeCase) return
    const evidenceRows = activeEvidence.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.integrity)}</td><td>${escapeHtml(item.sha256)}</td></tr>`).join('')
    const eventRows = activeEvents.map((event) => `<tr><td>${escapeHtml(formatDateTime(event.timestamp))}</td><td>${escapeHtml(event.title)}</td><td>${escapeHtml(event.origin)}</td><td>${escapeHtml(event.source)}</td></tr>`).join('')
    const hypothesis = aiResult ? aiResult.split('\n').slice(0, 8).join('\n') : 'No AI hypothesis recorded. Generate an assistant response only after reviewing its source and limitations.'
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>TRACE report · ${escapeHtml(activeCase.id)}</title><style>body{font:14px -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#20271b;max-width:960px;margin:48px auto;padding:0 32px;line-height:1.55}h1{margin-bottom:4px}h2{margin-top:32px;border-bottom:1px solid #dce3d0;padding-bottom:8px}small,.meta{color:#66705c}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #dce3d0;padding:8px;text-align:left;vertical-align:top;font-size:12px}th{background:#f2f4e9}.notice{background:#f6f1df;border:1px solid #d9ca91;padding:12px;border-radius:8px;white-space:pre-wrap}</style></head><body><div class="meta">TRACE · FICTIONAL DEMONSTRATION REPORT · generated ${escapeHtml(formatDateTime(new Date().toISOString()))}</div><h1>${escapeHtml(activeCase.title)}</h1><div class="meta">${escapeHtml(activeCase.id)} · ${escapeHtml(activeCase.category)} · ${escapeHtml(titleCase(activeCase.status))}</div><h2>Case overview</h2><p>${escapeHtml(activeCase.description)}</p><p><strong>Objective:</strong> Organize simulated records, identify reviewable signals, and document uncertainties without treating model suggestions as established fact.</p><h2>Evidence inventory</h2><table><tr><th>Name</th><th>Type</th><th>Integrity</th><th>SHA-256 / record</th></tr>${evidenceRows || '<tr><td colspan="4">No evidence linked.</td></tr>'}</table><h2>Timeline</h2><table><tr><th>Timestamp</th><th>Event</th><th>Origin</th><th>Source</th></tr>${eventRows || '<tr><td colspan="4">No events recorded.</td></tr>'}</table><h2>Observations and hypotheses</h2><div class="notice">${escapeHtml(hypothesis)}</div><h2>Known uncertainties and next steps</h2><ul><li>Confirm source completeness and preservation details independently.</li><li>Resolve identity, ownership and attribution questions using corroborating evidence.</li><li>Document gaps before updating status or reaching any conclusion.</li></ul><h2>Conclusion</h2><p>This report is an organized view of fictional or user-provided records. It is not forensic certification, legal advice, or a determination of wrongdoing.</p><script>window.onload=()=>window.print()</script></body></html>`
    const reportWindow = window.open('', '_blank')
    if (reportWindow) {
      reportWindow.opener = null
      reportWindow.document.open()
      reportWindow.document.write(html)
      reportWindow.document.close()
      return
    }
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `TRACE-${activeCase.id}-report.html`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1500)
    notify('Printable report downloaded as HTML because this browser blocks new windows.', 'info')
  }

  async function copyText(text: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const field = document.createElement('textarea')
        field.value = text
        field.setAttribute('readonly', '')
        field.style.position = 'fixed'
        field.style.opacity = '0'
        document.body.appendChild(field)
        field.select()
        const copied = document.execCommand('copy')
        field.remove()
        if (!copied) throw new Error('Clipboard is unavailable')
      }
      notify('Text copied to the clipboard.')
    } catch {
      notify('Clipboard access is unavailable. Select the text manually from the evidence preview.', 'info')
    }
  }

  function resetDemo() {
    if (!window.confirm('Restore the original fictional TRACE demonstration data? Your current local edits will be replaced.')) return
    const fresh = cloneDemo()
    setState(fresh)
    setActiveCaseId(fresh.cases[0].id)
    setSection('overview')
    setAiResult('')
    setAiResultMode(null)
    setAiError('')
    notify('Demo workspace restored.')
  }

  const filteredCases = useMemo(() => state.cases.filter((item) => {
    const matchesQuery = `${item.title} ${item.id} ${item.category}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (statusFilter === 'all' || item.status === statusFilter)
  }).sort((a, b) => sortOrder === 'title' ? a.title.localeCompare(b.title) : sortOrder === 'priority' ? ({ critical: 0, high: 1, medium: 2, low: 3 }[a.priority] - { critical: 0, high: 1, medium: 2, low: 3 }[b.priority]) : b.date.localeCompare(a.date)), [state.cases, query, sortOrder, statusFilter])

  if (view === 'landing') return <LandingPage onLaunch={() => launchWorkspace()} onNavigate={(next) => launchWorkspace(next)} />

  return (
    <div className="app-shell">
      {mobileNavOpen && <button className="mobile-sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <Sidebar section={section} onNavigate={(next) => { setSection(next); setMobileNavOpen(false); setUtilityPanel(null) }} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} onReset={resetDemo} cases={state.cases} activeCaseId={activeCase?.id || ''} onSelectCase={(id) => selectCase(id, 'cases')} onCreateCase={() => { setSection('cases'); setModal({ kind: 'case' }) }} onSettings={() => setUtilityPanel('settings')} />
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
            <div className="breadcrumb"><button className="breadcrumb-home" onClick={() => setSection('overview')}>Workspace</button><ChevronRight size={14} /><strong>{navItems.find((item) => item.id === section)?.label}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="demo-indicator"><span className="pulse-dot" /> Simulation mode</div>
            <button className="icon-button" title="Notifications" aria-label="Open notifications" aria-expanded={utilityPanel === 'notifications'} data-utility-trigger onClick={() => setUtilityPanel(utilityPanel === 'notifications' ? null : 'notifications')}><Bell size={17} /><span className="notification-dot" /></button>
            <button className="avatar" title="Investigator profile" aria-label="Open investigator profile" aria-expanded={utilityPanel === 'profile'} data-utility-trigger onClick={() => setUtilityPanel(utilityPanel === 'profile' ? null : 'profile')}>IR</button>
            {utilityPanel && <div className={`utility-panel ${utilityPanel}`} role="dialog" aria-label={utilityPanel === 'notifications' ? 'Notifications' : utilityPanel === 'profile' ? 'Investigator profile' : 'Workspace settings'}>
              <div className="utility-panel-head"><div><span className="panel-eyebrow">TRACE / {utilityPanel === 'notifications' ? 'SIGNAL STREAM' : utilityPanel === 'profile' ? 'PROFILE' : 'PREFERENCES'}</span><h2>{utilityPanel === 'notifications' ? 'Recent activity' : utilityPanel === 'profile' ? 'Investigator' : 'Workspace settings'}</h2></div><button className="icon-button small" aria-label="Close panel" onClick={() => setUtilityPanel(null)}><X size={15} /></button></div>
              {utilityPanel === 'notifications' && <div className="utility-activity-list">{state.activity.slice(0, 6).map((item) => <button key={item.id} className="utility-activity" onClick={() => item.caseId ? selectCase(item.caseId, 'cases') : setSection('timeline')}><span className={`activity-marker ${item.tone}`}><span /></span><span><strong>{item.label}</strong><small>{item.detail}</small></span><ChevronRight size={14} /></button>)}</div>}
              {utilityPanel === 'profile' && <div className="utility-profile"><div className="profile-card"><span className="avatar large">IR</span><span><strong>Investigator R.</strong><small>Local demonstration profile</small></span><CheckCircle2 size={17} /></div><p>This browser-only workspace contains fictional sample records. No account or cloud sync is active.</p><button className="secondary-button full-width" onClick={() => setUtilityPanel('settings')}><Settings2 size={15} /> Preferences</button><button className="link-button utility-reset" onClick={resetDemo}><RefreshCw size={14} /> Restore demo data</button></div>}
              {utilityPanel === 'settings' && <div className="utility-settings"><label className="preference-switch"><span><strong>Reduce motion</strong><small>Keep transitions subtle and disable ambient movement.</small></span><input type="checkbox" checked={reduceMotion} onChange={(event) => setReduceMotion(event.target.checked)} /></label><div className="settings-fact"><span>DATA STORAGE</span><strong>Stored in this browser only</strong></div><div className="settings-fact"><span>AI MODE</span><strong>Optional server-side service · demo fallback enabled</strong></div><button className="secondary-button full-width" onClick={() => setUtilityPanel(null)}><Check size={15} /> Done</button></div>}
            </div>}
          </div>
        </header>
        <main className="content-area">
          <div className="content-wrap">
            {section === 'overview' && <Overview stats={stats} state={state} onNavigate={(next) => setSection(next)} onSelectCase={selectCase} onShowCases={(filter) => { setStatusFilter(filter); setSection('cases') }} onFilterEvidenceCategory={(category) => { const match = state.evidence.find((item) => item.category === category); setEvidenceCategoryFilter(category); if (match) selectCase(match.caseId, 'evidence'); else setSection('evidence') }} onNewCase={() => { setSection('cases'); setModal({ kind: 'case' }) }} />}
            {section === 'cases' && <CasesView cases={filteredCases} activeCase={activeCase} activeEvidence={activeEvidence} activeEvents={activeEvents} activeEntities={activeEntities} query={query} setQuery={setQuery} searchInputRef={searchInputRef} sortOrder={sortOrder} setSortOrder={setSortOrder} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onNew={() => setModal({ kind: 'case' })} onEdit={() => activeCase && setModal({ kind: 'case', item: activeCase })} onDelete={() => activeCase && deleteCase(activeCase)} onSelect={selectCase} noteDraft={noteDraft} setNoteDraft={setNoteDraft} onAddNote={addNote} onJump={(next) => setSection(next)} aiPrompt={aiPrompt} setAiPrompt={setAiPrompt} aiResult={aiResult} aiResultMode={aiResultMode} aiError={aiError} aiLoading={aiLoading} onAskAI={askAssistant} />}
            {section === 'evidence' && <EvidenceView evidence={activeEvidence} activeCase={activeCase} selectedId={selectedEvidenceId} setSelectedId={setSelectedEvidenceId} filter={evidenceFilter} setFilter={setEvidenceFilter} categoryFilter={evidenceCategoryFilter} setCategoryFilter={setEvidenceCategoryFilter} fileInputRef={fileInputRef} verifyFileInputRef={verifyFileInputRef} onVerifyHash={(item) => { verifyTargetRef.current = item.id; verifyFileInputRef.current?.click() }} onVerifyFileChange={handleVerifyFileChange} onFileChange={handleFileChange} onDrop={handleDrop} onNew={() => setModal({ kind: 'evidence' })} onEdit={(item) => setModal({ kind: 'evidence', item })} onDelete={deleteEvidence} onSelectCase={(id) => selectCase(id, 'evidence')} onCopyText={copyText} cases={state.cases} />}
            {section === 'timeline' && <TimelineView events={activeEvents} evidence={activeEvidence} activeCase={activeCase} filter={timelineFilter} setFilter={setTimelineFilter} onNew={() => setModal({ kind: 'event' })} onEdit={(item) => setModal({ kind: 'event', item })} onDelete={deleteEvent} onOpenEvidence={(id) => { setSelectedEvidenceId(id); setEvidenceFilter('all'); setEvidenceCategoryFilter('all'); setSection('evidence') }} />}
            {section === 'entities' && <EntitiesView entities={activeEntities} evidence={activeEvidence} events={activeEvents} activeCase={activeCase} onNew={() => setModal({ kind: 'entity' })} onEdit={(item) => setModal({ kind: 'entity', item })} onDelete={deleteEntity} onShowEvidence={(id) => { setSelectedEvidenceId(id); setEvidenceFilter('all'); setEvidenceCategoryFilter('all'); setSection('evidence') }} onShowTimeline={() => setSection('timeline')} />}
            {section === 'reports' && <ReportsView activeCase={activeCase} evidence={activeEvidence} events={activeEvents} entities={activeEntities} aiResult={aiResult} onGenerate={generateReport} onNavigate={(next) => setSection(next)} />}
          </div>
        </main>
      </div>
      {modal && <RecordModal modal={modal} cases={state.cases} evidence={activeEvidence} events={activeEvents} onClose={() => setModal(null)} onSaveCase={saveCase} onSaveEvidence={saveEvidence} onSaveEvent={saveEvent} onSaveEntity={saveEntity} />}
      {toast && <div className={`toast toast-${toast.tone}`}><span>{toast.tone === 'success' ? <CheckCircle2 size={17} /> : toast.tone === 'error' ? <AlertCircle size={17} /> : <Info size={17} />}</span>{toast.message}<button onClick={() => setToast(null)} aria-label="Dismiss"><X size={14} /></button></div>}
    </div>
  )
}

function LandingPage({ onLaunch, onNavigate }: { onLaunch: () => void; onNavigate: (section: Section) => void }) {
  return <div className="landing-page">
    <div className="landing-grid" />
    <header className="landing-nav"><div className="brand-lockup"><LogoMark /><span>TRACE</span><em>AI DIGITAL CRIME SCENE</em></div><div className="landing-nav-right"><span className="status-chip"><span className="pulse-dot" /> local-first workspace</span><button className="text-button" onClick={onLaunch}>Open workspace <ArrowRight size={15} /></button></div></header>
    <main className="landing-main">
      <section className="hero-section">
        <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> EVIDENCE-FIRST INTELLIGENCE</div><h1>Keep the signal.<br /><span>Mark the uncertainty.</span></h1><p className="hero-description">TRACE is an AI-assisted digital investigation workspace for organizing evidence, reconstructing incident timelines, and turning scattered signals into explainable hypotheses.</p><div className="hero-actions"><button className="primary-button large" onClick={onLaunch}><span>Launch investigation workspace</span><ArrowRight size={17} /></button><div className="hero-note"><ShieldCheck size={16} /> Fictional data · human review required</div></div><div className="hero-proof"><div><strong>06</strong><span>evidence layers</span></div><div><strong>03</strong><span>case workspaces</span></div><div><strong>100%</strong><span>local-first demo</span></div></div></div>
        <div className="hero-visual"><div className="visual-glow" /><div className="preview-window"><div className="preview-bar"><div className="window-dots"><i /><i /><i /></div><span>TRACE / workspace / overview</span><span className="preview-live"><span className="pulse-dot" /> LIVE</span></div><div className="preview-content"><div className="preview-side"><LogoMark small /><div className="preview-side-line active" /><div className="preview-side-line" /><div className="preview-side-line" /><div className="preview-side-line" /><div className="preview-side-line" /></div><div className="preview-dashboard"><div className="preview-heading"><div><small>COMMAND CENTER</small><h3>Good evening, investigator</h3></div><span className="preview-tag">DEMO DATA</span></div><div className="preview-metrics"><div><small>ACTIVE CASES</small><strong>02</strong><span className="positive">+1 this week</span></div><div><small>EVIDENCE ITEMS</small><strong>06</strong><span>3 categories</span></div><div><small>REVIEW QUEUE</small><strong>01</strong><span className="warning">Needs attention</span></div></div><div className="preview-lower"><div className="preview-chart"><div className="mini-chart-label"><small>ACTIVITY SIGNAL</small><span>last 7 days</span></div><div className="sparkline"><span style={{ height: '30%' }} /><span style={{ height: '47%' }} /><span style={{ height: '39%' }} /><span style={{ height: '64%' }} /><span style={{ height: '52%' }} /><span style={{ height: '88%' }} /><span style={{ height: '76%' }} /></div></div><div className="preview-case"><small>ACTIVE INVESTIGATION</small><strong>Suspicious Account Access</strong><span>TRC-24017 · HIGH PRIORITY</span><div className="mini-progress"><i /></div></div></div></div></div></div></div>
      </section>
      <section className="landing-features"><div className="section-intro"><span className="eyebrow">ONE WORKSPACE / MANY SIGNALS</span><h2>From first artifact<br />to explainable report.</h2></div><div className="feature-grid"><Feature icon={Fingerprint} number="01" title="Evidence lab" text="Inspect metadata, extracted text, integrity hashes and processing state without overstating what the file reveals." section="evidence" onClick={() => onNavigate('evidence')} /><Feature icon={GitBranch} number="02" title="Incident timeline" text="Place source timestamps, manual events and AI suggestions on one chronological surface with clear provenance." section="timeline" onClick={() => onNavigate('timeline')} /><Feature icon={Network} number="03" title="Entity graph" text="Connect people, devices and records while preserving the difference between association and confirmation." section="entities" onClick={() => onNavigate('entities')} /><Feature icon={BrainCircuit} number="04" title="Human-led AI" text="Ask focused questions, see deterministic demo mode or connect a server-side Nebius model when configured." section="cases" onClick={() => onNavigate('cases')} /></div></section>
      <section className="landing-workflow"><div><span className="eyebrow">A CALM INVESTIGATION LOOP</span><h2>Better questions.<br /><span>Cleaner evidence.</span></h2></div><div className="workflow-steps"><WorkflowStep index="01" title="Collect" text="Add source files or manual records to a named fictional case." onClick={() => onNavigate('evidence')} /><WorkflowStep index="02" title="Connect" text="Link evidence, entities and timeline events with visible provenance." onClick={() => onNavigate('entities')} /><WorkflowStep index="03" title="Review" text="Ask the assistant to surface hypotheses, gaps and next questions." onClick={() => onNavigate('cases')} /><WorkflowStep index="04" title="Report" text="Export a structured summary where uncertainty stays visible." onClick={() => onNavigate('reports')} /></div></section>
    </main>
    <footer className="landing-footer"><div className="brand-lockup"><LogoMark small /><span>TRACE</span></div><span>Built for thoughtful digital investigation demos.</span><span>© 2026 · No real-world forensic certification</span></footer>
  </div>
}

function Feature({ icon: Icon, number, title, text, section, onClick }: { icon: LucideIcon; number: string; title: string; text: string; section: Section; onClick: () => void }) {
  return <button type="button" className="feature-card feature-link" onClick={onClick} aria-label={`Open ${title}`}><div className="feature-top"><span>{number}</span><Icon size={20} /></div><h3>{title}</h3><p>{text}</p><span className="feature-destination">OPEN {section.toUpperCase()}</span><ArrowUpRight /></button>
}
function WorkflowStep({ index, title, text, onClick }: { index: string; title: string; text: string; onClick: () => void }) {
  return <button type="button" className="workflow-step" onClick={onClick}><span>{index}</span><div><h3>{title}</h3><p>{text}</p></div><ChevronRight size={18} /></button>
}
function ArrowUpRight() { return <ArrowRight className="feature-arrow" size={17} /> }

function LogoMark({ small = false }: { small?: boolean }) { return <span className={`logo-mark ${small ? 'small' : ''}`} aria-hidden="true"><i /><i /><b /></span> }

function Sidebar({ section, onNavigate, mobileOpen, onClose, onReset, cases, activeCaseId, onSelectCase, onCreateCase, onSettings }: { section: Section; onNavigate: (section: Section) => void; mobileOpen: boolean; onClose: () => void; onReset: () => void; cases: InvestigationCase[]; activeCaseId: string; onSelectCase: (id: string) => void; onCreateCase: () => void; onSettings: () => void }) {
  const [caseMenuOpen, setCaseMenuOpen] = useState(false)
  const activeCase = cases.find((item) => item.id === activeCaseId)
  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest('.workspace-switcher')) setCaseMenuOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setCaseMenuOpen(false) }
    document.addEventListener('pointerdown', closeMenu)
    window.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('pointerdown', closeMenu); window.removeEventListener('keydown', closeOnEscape) }
  }, [])
  return <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
    <div className="sidebar-top"><button type="button" className="brand-lockup sidebar-brand" onClick={() => onNavigate('overview')} aria-label="Go to TRACE overview"><LogoMark /><span><strong>TRACE</strong><small>AI DIGITAL FORENSICS</small></span></button><button type="button" className="icon-button sidebar-close" onClick={onClose} aria-label="Close navigation"><X size={18} /></button></div>
    <div className="workspace-switcher"><button type="button" className="workspace-badge" onClick={() => setCaseMenuOpen((open) => !open)} aria-expanded={caseMenuOpen}><span className="workspace-badge-icon"><LockKeyhole size={14} /></span><span><small>WORKSPACE · ACTIVE CASE</small><strong>{activeCase?.title || 'No active case'}</strong></span><ChevronDown size={14} /></button>
      {caseMenuOpen && <div className="workspace-menu" role="menu" aria-label="Choose an investigation">{cases.map((item) => <button type="button" role="menuitem" key={item.id} className={item.id === activeCaseId ? 'selected' : ''} onClick={() => { onSelectCase(item.id); setCaseMenuOpen(false) }}><span><strong>{item.title}</strong><small>{item.id} · {titleCase(item.status)}</small></span>{item.id === activeCaseId && <Check size={14} />}</button>)}<button type="button" role="menuitem" className="workspace-menu-create" onClick={() => { onCreateCase(); setCaseMenuOpen(false) }}><Plus size={14} /> Create a new case</button></div>}
    </div>
    <nav className="sidebar-nav" aria-label="Main navigation">{navItems.map((item) => <button type="button" key={item.id} className={`nav-item ${section === item.id ? 'active' : ''}`} onClick={() => onNavigate(item.id)} aria-current={section === item.id ? 'page' : undefined}><item.icon size={18} /><span><strong>{item.label}</strong><small>{item.hint}</small></span>{section === item.id && <i />}</button>)}</nav>
    <div className="sidebar-bottom"><div className="storage-card"><div><Database size={16} /><span>LOCAL STORAGE</span></div><strong>Browser-only persistence</strong><div className="storage-bar"><i /></div><small>No cloud backup enabled</small></div><button type="button" className="sidebar-action" onClick={onReset}><RefreshCw size={16} /> Reset demo data</button><div className="sidebar-foot"><span className="avatar">IR</span><div><strong>Investigator</strong><span>Human review required</span></div><button type="button" className="icon-button settings-trigger" onClick={onSettings} aria-label="Open workspace settings" title="Workspace settings"><Settings2 size={16} /></button></div></div>
  </aside>
}

function SectionTitle({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: ReactNode }) { return <div className="section-title"><div><div className="eyebrow"><span className="eyebrow-line" /> {eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="section-actions">{actions}</div>}</div> }
function StatusPill({ status }: { status: CaseStatus }) { return <span className={`status-pill ${status}`}><i />{titleCase(status)}</span> }
function PriorityPill({ priority }: { priority: Priority }) { return <span className={`priority-pill ${priority}`}>{priority}</span> }
function OriginPill({ origin }: { origin: RecordOrigin }) { return <span className={`origin-pill ${origin}`}>{origin === 'ai-suggested' ? 'AI suggestion' : origin}</span> }
function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) { return <div className="empty-state"><div className="empty-icon"><Icon size={22} /></div><h3>{title}</h3><p>{text}</p>{action}</div> }

function Overview({ stats, state, onNavigate, onSelectCase, onShowCases, onFilterEvidenceCategory, onNewCase }: { stats: { cases: number; active: number; review: number; evidence: number; events: number; entities: number }; state: StoreState; onNavigate: (section: Section) => void; onSelectCase: (id: string, next?: Section) => void; onShowCases: (filter: 'all' | 'active' | 'review') => void; onFilterEvidenceCategory: (category: string) => void; onNewCase: () => void }) {
  const statusCounts = { active: state.cases.filter((item) => item.status === 'active').length, review: state.cases.filter((item) => item.status === 'review').length, closed: state.cases.filter((item) => item.status === 'closed').length }
  const categories = Array.from(new Set(state.evidence.map((item) => item.category))).slice(0, 5)
  const evidenceTotal = Math.max(1, state.evidence.length)
  return <div className="page-stack">
    <SectionTitle eyebrow="Command center" title="Good evening, investigator." description="A clear view of the signals, open questions and fictional cases in your workspace." actions={<><button type="button" className="secondary-button" onClick={() => onNavigate('evidence')}><UploadCloud size={16} /> Add evidence</button><button type="button" className="primary-button" onClick={onNewCase}><Plus size={16} /> New case</button></>} />
    <div className="data-notice"><Info size={16} /><span><strong>Simulation workspace.</strong> Seeded records are fictional and designed for demonstration. AI outputs remain hypotheses until a human reviews their sources.</span><button type="button" onClick={() => onNavigate('reports')}>Read methodology <ArrowRight size={14} /></button></div>
    <div className="metric-grid">
      <Metric label="Total cases" value={stats.cases.toString().padStart(2, '0')} detail="Across this workspace" icon={FolderOpen} tone="cyan" onClick={() => onShowCases('all')} />
      <Metric label="Active investigations" value={stats.active.toString().padStart(2, '0')} detail="Currently in motion" icon={Activity} tone="blue" onClick={() => onShowCases('active')} />
      <Metric label="Evidence collected" value={stats.evidence.toString().padStart(2, '0')} detail="Across linked cases" icon={Fingerprint} tone="violet" onClick={() => onNavigate('evidence')} />
      <Metric label="Awaiting review" value={stats.review.toString().padStart(2, '0')} detail="Human attention needed" icon={AlertCircle} tone="amber" onClick={() => onShowCases('review')} />
    </div>
    <div className="dashboard-grid">
      <div className="panel activity-panel"><PanelHeader eyebrow="Recent activity" title="Signal stream" action={<button type="button" className="link-button" onClick={() => onNavigate('timeline')}>View timeline <ArrowRight size={14} /></button>} />{state.activity.slice(0, 5).map((item) => <button type="button" className="activity-row activity-link" key={item.id} onClick={() => item.caseId ? onSelectCase(item.caseId, 'cases') : onNavigate('timeline')} aria-label={`Open activity: ${item.label}`}><span className={`activity-marker ${item.tone}`}><span /></span><span className="activity-copy"><strong>{item.label}</strong><span>{item.detail}</span></span><time>{formatRelative(item.time)}</time></button>)}</div>
      <div className="panel case-health-panel"><PanelHeader eyebrow="Case health" title="Workspace pulse" action={<span className="panel-readout"><Activity size={16} /> LIVE</span>} /><div className="health-body"><div className="donut-wrap"><div className="donut-chart" style={{ background: `conic-gradient(#a8b66e 0 ${statusCounts.active / Math.max(1, stats.cases) * 100}%, #d8af58 ${statusCounts.active / Math.max(1, stats.cases) * 100}% ${(statusCounts.active + statusCounts.review) / Math.max(1, stats.cases) * 100}%, #87907a ${(statusCounts.active + statusCounts.review) / Math.max(1, stats.cases) * 100}% 100%)` }}><div><strong>{stats.cases}</strong><span>cases</span></div></div></div><div className="legend-list"><button type="button" onClick={() => onShowCases('active')}><i className="cyan" /> Active <b>{statusCounts.active}</b></button><button type="button" onClick={() => onShowCases('review')}><i className="amber" /> Review <b>{statusCounts.review}</b></button><button type="button" onClick={() => onShowCases('all')}><i className="slate" /> Closed <b>{statusCounts.closed}</b></button></div></div><div className="health-footer"><span><CheckCircle2 size={15} /> All systems local</span><small>Updated just now</small></div></div>
      <div className="panel evidence-volume"><PanelHeader eyebrow="Evidence mix" title="What is in the lab" action={<button type="button" className="link-button" onClick={() => onNavigate('evidence')}>Open lab <ArrowRight size={14} /></button>} /><div className="bar-list">{categories.length ? categories.map((category) => { const count = state.evidence.filter((item) => item.category === category).length; return <button type="button" className="bar-row category-link" key={category} onClick={() => onFilterEvidenceCategory(category)} aria-label={`Filter evidence by ${category}`}><span><span>{category}</span><b>{count}</b></span><span className="bar-track"><i style={{ width: `${Math.max(16, count / evidenceTotal * 100)}%` }} /></span></button> }) : <EmptyState icon={Fingerprint} title="No evidence yet" text="Add a record to see categories here." action={<button type="button" className="link-button" onClick={() => onNavigate('evidence')}>Open evidence lab</button>} />}</div><div className="panel-footnote"><Hash size={14} /> Hash coverage is shown per evidence record</div></div>
      <div className="panel recent-cases"><PanelHeader eyebrow="Your investigations" title="Recent cases" action={<button type="button" className="link-button" onClick={() => onShowCases('all')}>View all <ArrowRight size={14} /></button>} /><div className="case-table">{state.cases.length ? state.cases.map((item) => <button type="button" className="case-table-row" key={item.id} onClick={() => onSelectCase(item.id)}><span className="case-table-id"><span className={`case-icon ${item.priority}`}><FolderOpen size={16} /></span><span><strong>{item.title}</strong><span>{item.id} · {item.category}</span></span></span><PriorityPill priority={item.priority} /><StatusPill status={item.status} /><ChevronRight size={15} /></button>) : <EmptyState icon={FolderOpen} title="No cases yet" text="Create a case to organize investigation records." action={<button type="button" className="primary-button" onClick={onNewCase}><Plus size={15} /> Create a case</button>} />}</div></div>
    </div>
  </div>
}

function Metric({ label, value, detail, icon: Icon, tone, onClick }: { label: string; value: string; detail: string; icon: LucideIcon; tone: string; onClick: () => void }) {
  return <button type="button" className="metric-card metric-link" onClick={onClick}><span className={`metric-icon ${tone}`}><Icon size={18} /></span><span className="metric-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></span><span className="metric-spark" aria-hidden="true"><i /><i /><i /><i /><i /></span><ChevronRight className="metric-arrow" size={15} /></button>
}
function PanelHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) { return <div className="panel-header"><div><span className="panel-eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action}</div> }

function CasesView(props: { cases: InvestigationCase[]; activeCase?: InvestigationCase; activeEvidence: EvidenceItem[]; activeEvents: TimelineEvent[]; activeEntities: Entity[]; query: string; setQuery: (value: string) => void; searchInputRef: React.RefObject<HTMLInputElement>; sortOrder: 'newest' | 'priority' | 'title'; setSortOrder: (value: 'newest' | 'priority' | 'title') => void; statusFilter: 'all' | CaseStatus; setStatusFilter: (value: 'all' | CaseStatus) => void; onNew: () => void; onEdit: () => void; onDelete: () => void; onSelect: (id: string, next?: Section) => void; noteDraft: string; setNoteDraft: (value: string) => void; onAddNote: () => void; onJump: (next: Section) => void; aiPrompt: string; setAiPrompt: (value: string) => void; aiResult: string; aiResultMode: 'live' | 'demo' | null; aiError: string; aiLoading: boolean; onAskAI: () => void }) {
  const { cases, activeCase, activeEvidence, activeEvents, activeEntities } = props
  return <div className="page-stack"><SectionTitle eyebrow="Case management" title="Investigations" description="Create a case, keep records separated, and stay explicit about what is known versus inferred." actions={<button className="primary-button" onClick={props.onNew}><Plus size={16} /> Create case</button>} /><div className="toolbar"><label className="search-field"><Search size={16} /><input ref={props.searchInputRef} value={props.query} onChange={(event) => props.setQuery(event.target.value)} placeholder="Search case ID, title or category" aria-label="Search cases by ID, title or category" /><kbd>⌘ K</kbd></label><div className="toolbar-selects"><label><ListFilter size={15} /><select value={props.statusFilter} onChange={(event) => props.setStatusFilter(event.target.value as 'all' | CaseStatus)}><option value="all">All statuses</option><option value="active">Active</option><option value="review">Review</option><option value="closed">Closed</option></select></label><label><ArrowDownUp size={15} /><select value={props.sortOrder} onChange={(event) => props.setSortOrder(event.target.value as 'newest' | 'priority' | 'title')}><option value="newest">Newest first</option><option value="priority">Priority</option><option value="title">Title A–Z</option></select></label></div></div><div className="cases-layout"><div className="cases-list"><div className="list-heading"><span>{cases.length} case{cases.length === 1 ? '' : 's'} found</span><span className="muted-label">Fictional demo records</span></div>{cases.length ? cases.map((item) => <button className={`case-card ${activeCase?.id === item.id ? 'selected' : ''}`} key={item.id} onClick={() => props.onSelect(item.id)}><div className="case-card-top"><span className={`case-icon ${item.priority}`}><FolderOpen size={17} /></span><div><span className="mono-label">{item.id}</span><h3>{item.title}</h3></div><ChevronRight size={16} /></div><p>{item.description}</p><div className="case-card-bottom"><StatusPill status={item.status} /><PriorityPill priority={item.priority} /><span><CalendarDays size={13} /> {formatDate(item.date)}</span></div></button>) : <EmptyState icon={FolderOpen} title="No matching cases" text="Change your filters or create a new fictional investigation." action={<button className="secondary-button" onClick={props.onNew}><Plus size={15} /> Create case</button>} />}</div>{activeCase ? <div className="case-detail"><div className="case-detail-header"><div><span className="mono-label">{activeCase.id} · FICTIONAL CASE</span><h2>{activeCase.title}</h2><p>{activeCase.description}</p></div><div className="case-detail-actions"><button className="icon-button" title="Edit case" onClick={props.onEdit}><Settings2 size={16} /></button><button className="icon-button danger" title="Delete case" onClick={props.onDelete}><Trash2 size={16} /></button></div></div><div className="detail-facts"><div><span>STATUS</span><StatusPill status={activeCase.status} /></div><div><span>PRIORITY</span><PriorityPill priority={activeCase.priority} /></div><div><span>OPENED</span><strong>{formatDate(activeCase.date)}</strong></div><div><span>RECORDS</span><strong>{activeEvidence.length + activeEvents.length + activeEntities.length} linked</strong></div></div><div className="case-tabs"><button onClick={() => props.onJump('evidence')}><Fingerprint size={15} /> Evidence <b>{activeEvidence.length}</b></button><button onClick={() => props.onJump('timeline')}><Clock3 size={15} /> Timeline <b>{activeEvents.length}</b></button><button onClick={() => props.onJump('entities')}><Network size={15} /> Entities <b>{activeEntities.length}</b></button><button onClick={() => props.onJump('reports')}><ClipboardList size={15} /> Report <ChevronRight size={14} /></button></div><div className="case-detail-grid"><div className="notes-card"><div className="card-heading"><span className="panel-eyebrow">Investigator notes</span><Tag size={15} /></div>{activeCase.notes.length ? <div className="notes-list">{activeCase.notes.map((note, index) => <div key={`${note}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><p>{note}</p></div>)}</div> : <p className="muted-copy">No notes yet. Add the first human-authored observation below.</p>}<div className="note-input"><input value={props.noteDraft} onChange={(event) => props.setNoteDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') props.onAddNote() }} placeholder="Add a case note…" /><button onClick={props.onAddNote}><Plus size={15} /></button></div></div><AssistantCard activeCase={activeCase} aiPrompt={props.aiPrompt} setAiPrompt={props.setAiPrompt} aiResult={props.aiResult} aiResultMode={props.aiResultMode} aiError={props.aiError} aiLoading={props.aiLoading} onAskAI={props.onAskAI} /></div></div> : <EmptyState icon={FolderOpen} title="Select a case" text="Choose an investigation to inspect its workspace." />}</div></div>
}

function AssistantCard({ activeCase, aiPrompt, setAiPrompt, aiResult, aiResultMode, aiError, aiLoading, onAskAI }: { activeCase?: InvestigationCase; aiPrompt: string; setAiPrompt: (value: string) => void; aiResult: string; aiResultMode: 'live' | 'demo' | null; aiError: string; aiLoading: boolean; onAskAI: () => void }) {
  return <div className="assistant-card"><div className="assistant-heading"><div className="assistant-orb"><Sparkles size={17} /></div><div><span className="panel-eyebrow">TRACE assistant</span><h3>Ask the evidence</h3></div><span className="ai-mode"><span className="pulse-dot" /> {aiResultMode === 'live' ? 'live model' : 'demo ready'}</span></div><p className="assistant-intro">Context-aware suggestions for <strong>{activeCase?.id}</strong>. Outputs are hypotheses for human review, never findings.</p><div className="prompt-chips"><button onClick={() => setAiPrompt('Summarize the active investigation and flag the most important review gaps.')}>Summarize case</button><button onClick={() => setAiPrompt('Explain the most suspicious-looking log or timestamp and what would corroborate it.')}>Explain a signal</button><button onClick={() => setAiPrompt('Suggest three focused investigative questions for the next review pass.')}>Suggest questions</button></div><div className="assistant-input"><textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} rows={3} placeholder="Ask a focused question about this case…" /><button className="send-button" onClick={onAskAI} disabled={aiLoading}>{aiLoading ? <RefreshCw className="spin" size={16} /> : <Send size={16} />}</button></div>{aiError && <div className="ai-error"><AlertCircle size={15} /> {aiError}</div>}{aiResult && <div className="ai-result"><div className="result-label"><span><BrainCircuit size={14} /> {aiResultMode === 'live' ? 'AI-generated suggestion' : 'Local demonstration guidance'}</span><span>Review required</span></div><pre>{aiResult}</pre></div>}</div>
}

function EvidenceView(props: { evidence: EvidenceItem[]; activeCase?: InvestigationCase; selectedId: string | null; setSelectedId: (id: string) => void; filter: string; setFilter: (value: string) => void; categoryFilter: string; setCategoryFilter: (value: string) => void; onCopyText: (text: string) => void; fileInputRef: React.RefObject<HTMLInputElement>; verifyFileInputRef: React.RefObject<HTMLInputElement>; onVerifyHash: (item: EvidenceItem) => void; onVerifyFileChange: (event: ChangeEvent<HTMLInputElement>) => void; onFileChange: (event: ChangeEvent<HTMLInputElement>) => void; onDrop: (event: DragEvent<HTMLDivElement>) => void; onNew: () => void; onEdit: (item: EvidenceItem) => void; onDelete: (item: EvidenceItem) => void; onSelectCase: (id: string) => void; cases: InvestigationCase[] }) {
  const filtered = props.evidence.filter((item) => (props.filter === 'all' || item.type === props.filter) && (props.categoryFilter === 'all' || item.category === props.categoryFilter))
  const selected = filtered.find((item) => item.id === props.selectedId) || filtered[0]
  const types = Array.from(new Set(props.evidence.map((item) => item.type)))
  const categories = Array.from(new Set(props.evidence.map((item) => item.category)))
  return <div className="page-stack"><SectionTitle eyebrow="Digital evidence lab" title="Inspect the source layer." description="Metadata, extracted text and integrity state stay visible so the interface never overclaims what was analyzed." actions={<button className="secondary-button" onClick={props.onNew}><Plus size={16} /> Manual record</button>} /><div className="evidence-top-grid"><div className="upload-zone" onDragOver={(event) => event.preventDefault()} onDrop={props.onDrop}><input ref={props.fileInputRef} type="file" multiple hidden accept=".txt,.log,.csv,.json,.md,.xml,.html,.pdf,.jpg,.jpeg,.png,.webp,.bmp,text/*,application/pdf,image/*" onChange={props.onFileChange} /><input ref={props.verifyFileInputRef} type="file" hidden onChange={props.onVerifyFileChange} /><div className="upload-icon"><UploadCloud size={23} /></div><div><h3>Drop evidence files here</h3><p>Images (OCR), PDFs (text + scanned-page OCR), TXT, LOG, CSV, JSON, MD, XML and HTML</p><span>Up to 15 MB per file · processing runs in your browser</span></div><button type="button" className="primary-button" onClick={() => props.fileInputRef.current?.click()}>Choose files</button></div><div className="evidence-integrity-card"><div className="card-heading"><span className="panel-eyebrow">Integrity overview</span><ShieldCheck size={16} /></div><div className="integrity-number"><strong>{props.evidence.length.toString().padStart(2, '0')}</strong><span>linked records</span></div><div className="integrity-progress"><i style={{ width: `${props.evidence.length ? props.evidence.filter((item) => item.sha256 !== 'manual entry').length / props.evidence.length * 100 : 0}%` }} /></div><div className="integrity-meta"><span><CheckCircle2 size={14} /> {props.evidence.filter((item) => item.status === 'processed').length} processed</span><span><Info size={14} /> {props.evidence.filter((item) => item.status !== 'processed').length} metadata only / error</span></div></div></div><div className="toolbar evidence-toolbar"><div className="toolbar-title"><Fingerprint size={17} /><span>{props.activeCase?.id || 'No active case'} <small>· {props.evidence.length} linked items</small></span></div><div className="evidence-filter-controls"><label><ListFilter size={15} /><select aria-label="Filter evidence by file type" value={props.filter} onChange={(event) => props.setFilter(event.target.value)}><option value="all">All types</option>{types.map((type) => <option key={type} value={type}>{type}</option>)}</select></label><label><Tag size={14} /><select aria-label="Filter evidence by category" value={props.categoryFilter} onChange={(event) => props.setCategoryFilter(event.target.value)}><option value="all">All categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label></div></div><div className="evidence-layout"><div className="evidence-list">{filtered.length ? filtered.map((item) => <button className={`evidence-row ${selected?.id === item.id ? 'selected' : ''}`} key={item.id} onClick={() => props.setSelectedId(item.id)}><span className={`file-icon ${item.type.toLowerCase()}`}><FileIcon type={item.type} /></span><div className="evidence-row-copy"><strong>{item.name}</strong><span>{item.type} · {formatBytes(item.size)} · {formatRelative(item.uploadedAt)}</span></div><div className="evidence-row-status"><span className={`processing-dot ${item.status}`} /><span>{item.status === 'processed' ? 'Ready' : item.status === 'processing' ? 'Processing' : item.status === 'error' ? 'Failed' : 'Review'}</span></div><ChevronRight size={15} /></button>) : <EmptyState icon={Fingerprint} title="No evidence matches" text="Try another file type or add a new record." />}</div>{selected ? <div className="evidence-detail panel"><div className="evidence-detail-heading"><div><span className="mono-label">{selected.id} · {selected.origin}</span><h2>{selected.name}</h2><p>{selected.description}</p></div><div className="detail-actions"><button className="icon-button" onClick={() => props.onEdit(selected)}><Settings2 size={16} /></button><button className="icon-button danger" onClick={() => props.onDelete(selected)}><Trash2 size={16} /></button></div></div><div className="evidence-meta-grid"><Meta icon={FileArchive} label="Type" value={selected.type} /><Meta icon={Database} label="Size" value={formatBytes(selected.size)} /><Meta icon={Clock3} label="Added" value={formatDateTime(selected.uploadedAt)} /><Meta icon={ShieldCheck} label="Processing" value={selected.status === 'processed' ? 'Completed' : selected.status === 'processing' ? 'Processing' : selected.status === 'error' ? 'Failed' : 'Needs review'} /></div><div className="hash-block"><div><Hash size={15} /><span>SHA-256 / record integrity</span></div><code>{selected.sha256}</code><button type="button" className="secondary-button hash-verify-button" onClick={() => props.onVerifyHash(selected)} disabled={!/^[a-f0-9]{64}$/i.test(selected.sha256)}>Compare with original</button>{selected.hashVerification && <div className={`hash-verification ${selected.hashVerification}`}><strong>{selected.hashVerification === "match" ? "Hash Match" : selected.hashVerification === "mismatch" ? "Hash Mismatch" : "Unable to verify"}</strong><span>{selected.hashVerification === "match" ? "Selected file matches the stored hash." : selected.hashVerification === "mismatch" ? "Selected file differs from the stored hash." : "Hash comparison is unavailable in this browser."}</span>{selected.hashVerifiedAt && <small>Checked {formatDateTime(selected.hashVerifiedAt)}</small>}</div>}</div><div className="extracted-block"><div className="extracted-heading"><span className="panel-eyebrow">Extracted text</span>{selected.extractedText && <button type="button" className="link-button" onClick={() => props.onCopyText(selected.extractedText)}><Download size={14} /> Copy text</button>}</div>{selected.extractionMethod && <div className="extraction-method"><span>Method</span><strong>{selected.extractionMethod}</strong></div>}{selected.extractedText ? <pre>{selected.extractedText}</pre> : <div className={`metadata-warning ${selected.status === 'error' ? 'error' : ''}`}><Info size={16} /><div><strong>{selected.status === 'processing' ? 'Processing evidence…' : selected.status === 'error' ? 'Processing failed' : selected.processingMessage?.includes('No readable text') ? 'No readable text detected' : 'No extracted content available'}</strong><span>{selected.processingMessage || 'This is an existing evidence record without stored extracted text. Re-upload the original file to run extraction.'}</span></div></div>}</div><div className="evidence-detail-foot"><OriginPill origin={selected.origin} /><span><LockKeyhole size={13} /> Browser-local record</span></div></div> : <EmptyState icon={FileText} title="Select evidence" text="Choose a record to inspect metadata and extracted content." />}</div></div>
}
function FileIcon({ type }: { type: string }) { if (type === 'JSON') return <FileJson2 size={17} />; if (type === 'CSV') return <Table2 size={17} />; if (type === 'LOG') return <FileCode2 size={17} />; if (['JPG', 'JPEG', 'PNG', 'WEBP'].includes(type)) return <ImageIcon size={17} />; return <FileText size={17} /> }
function Meta({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) { return <div className="meta-block"><Icon size={15} /><span>{label}</span><strong>{value}</strong></div> }

function TimelineView({ events, evidence, activeCase, filter, setFilter, onNew, onEdit, onDelete, onOpenEvidence }: { events: TimelineEvent[]; evidence: EvidenceItem[]; activeCase?: InvestigationCase; filter: string; setFilter: (value: string) => void; onNew: () => void; onEdit: (item: TimelineEvent) => void; onDelete: (item: TimelineEvent) => void; onOpenEvidence: (id: string) => void }) {
  const categories = Array.from(new Set(events.map((event) => event.category)))
  const filtered = events.filter((event) => filter === 'all' || event.category === filter).sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  return <div className="page-stack"><SectionTitle eyebrow="Incident timeline" title="Reconstruct the sequence." description="Source timestamps, manual entries and AI suggestions are separated by origin. TRACE never invents a time that is not recorded." actions={<button type="button" className="primary-button" onClick={onNew}><Plus size={16} /> Add event</button>} />
    <div className="timeline-summary"><div><Clock3 size={18} /><span><strong>{events.length}</strong> recorded events</span></div><div><GitBranch size={18} /><span><strong>{new Set(events.map((item) => item.source)).size}</strong> evidence sources</span></div><div><Info size={18} /><span>Earliest event is <strong>{events[0] ? formatDateTime(events[0].timestamp) : 'not available'}</strong></span></div><label><ListFilter size={15} /><select aria-label="Filter timeline events by category" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label></div>
    <div className="timeline-shell"><div className="timeline-head"><div><span className="panel-eyebrow">{activeCase?.id || 'NO CASE'}</span><h2>Evidence-led sequence</h2></div><div className="origin-legend"><OriginPill origin="imported" /><OriginPill origin="manual" /><OriginPill origin="ai-suggested" /></div></div>
      {filtered.length ? <div className="timeline-list">{filtered.map((event) => <div className="timeline-item" key={event.id}><div className="timeline-rail"><span className={`timeline-node ${event.origin}`}><CircleDot size={12} /></span></div><div className="timeline-content"><div className="timeline-event-top"><div><span className="event-time">{formatDateTime(event.timestamp)}</span><button type="button" className="timeline-title-button" onClick={() => onEdit(event)}><h3>{event.title}</h3><ArrowUpRight /></button></div><div className="timeline-event-actions"><OriginPill origin={event.origin} /><button type="button" className="icon-button small" aria-label={`Edit ${event.title}`} onClick={() => onEdit(event)}><Settings2 size={14} /></button><button type="button" className="icon-button small danger" aria-label={`Delete ${event.title}`} onClick={() => onDelete(event)}><Trash2 size={14} /></button></div></div><p>{event.description}</p><div className="timeline-source"><span><GitBranch size={13} /> {event.source}</span>{event.evidenceId && <button type="button" className="timeline-evidence-link" onClick={() => onOpenEvidence(event.evidenceId!)}><Link2 size={13} /> {evidence.find((item) => item.id === event.evidenceId)?.name || event.evidenceId}</button>}<span className="category-tag">{event.category}</span></div></div></div>)}</div> : <EmptyState icon={Clock3} title="No events recorded" text="Add a manual event or import supported evidence to begin the sequence." action={<button type="button" className="secondary-button" onClick={onNew}><Plus size={15} /> Add event</button>} />}
    </div>
  </div>
}

function EntitiesView({ entities, evidence, events, activeCase, onNew, onEdit, onDelete, onShowEvidence, onShowTimeline }: { entities: Entity[]; evidence: EvidenceItem[]; events: TimelineEvent[]; activeCase?: InvestigationCase; onNew: () => void; onEdit: (item: Entity) => void; onDelete: (item: Entity) => void; onShowEvidence: (id: string) => void; onShowTimeline: () => void }) {
  return <div className="page-stack"><SectionTitle eyebrow="Suspects & entities" title="Map the known connections." description="An association is a link in the record, not a conclusion about guilt, intent or identity." actions={<button type="button" className="primary-button" onClick={onNew}><Plus size={16} /> Add entity</button>} />
    <div className="relationship-banner"><div className="banner-icon"><Network size={20} /></div><div><strong>Relationship view · {activeCase?.id}</strong><span>Lines represent recorded references across evidence and events. They do not establish a confirmed connection.</span></div><span className="banner-status"><span className="pulse-dot" /> Live graph</span></div>
    <div className="entity-graph panel"><div className="graph-label top">Recorded association map</div><div className="graph-core"><div className="graph-ring ring-one" /><div className="graph-ring ring-two" /><div className="graph-center"><LogoMark small /><span>{activeCase?.id || 'CASE'}</span></div>{entities.slice(0, 6).map((entity, index) => <button type="button" className={`graph-node node-${index + 1}`} key={entity.id} onClick={() => onEdit(entity)} aria-label={`Edit entity ${entity.name}`}><span className={`entity-avatar ${entity.type}`}><EntityIcon type={entity.type} /></span><span><strong>{entity.name}</strong><small>{entity.relationship}</small></span></button>)}</div><div className="graph-legend"><span><i className="line-cyan" /> Evidence reference</span><span><i className="line-violet" /> Timeline reference</span><span><Info size={13} /> association only</span></div></div>
    <div className="entity-grid">{entities.map((entity) => <article className="entity-card" key={entity.id}><div className="entity-card-top"><span className={`entity-avatar ${entity.type}`}><EntityIcon type={entity.type} /></span><div><span className="mono-label">{entity.id} · {entity.type}</span><h3>{entity.name}</h3><span className="entity-alias">{entity.alias}</span></div><div className="entity-card-actions"><button type="button" className="icon-button small" aria-label={`Edit ${entity.name}`} onClick={() => onEdit(entity)}><Settings2 size={14} /></button><button type="button" className="icon-button small danger" aria-label={`Delete ${entity.name}`} onClick={() => onDelete(entity)}><Trash2 size={14} /></button></div></div><p>{entity.description}</p><div className="relationship-label"><Link2 size={14} /><span>{entity.relationship}</span></div><div className="entity-links"><button type="button" onClick={() => { const first = entity.evidenceIds.find((id) => evidence.some((item) => item.id === id)); onShowEvidence(first || '') }} disabled={!entity.evidenceIds.length}><Fingerprint size={13} /> {entity.evidenceIds.length} evidence links</button><button type="button" onClick={onShowTimeline} disabled={!entity.eventIds.length}><Clock3 size={13} /> {entity.eventIds.length} event links</button></div><div className="entity-note"><Info size={13} /> {entity.notes}</div></article>)}</div>
    {!entities.length && <EmptyState icon={UsersRound} title="No entities linked" text="Create a profile to make recorded associations visible." action={<button type="button" className="secondary-button" onClick={onNew}><Plus size={15} /> Add entity</button>} />}
  </div>
}
function EntityIcon({ type }: { type: Entity['type'] }) { return type === 'device' ? <Database size={16} /> : type === 'account' ? <LockKeyhole size={16} /> : type === 'organization' ? <UsersRound size={16} /> : <UserRound size={16} /> }

function ReportsView({ activeCase, evidence, events, entities, aiResult, onGenerate, onNavigate }: { activeCase?: InvestigationCase; evidence: EvidenceItem[]; events: TimelineEvent[]; entities: Entity[]; aiResult: string; onGenerate: () => void; onNavigate: (section: Section) => void }) {
  return <div className="page-stack"><SectionTitle eyebrow="Investigation report" title="Make the record legible." description="A structured, print-friendly view of the case. Hypotheses stay labeled and evidence gaps remain visible." actions={<button className="primary-button" onClick={onGenerate}><Printer size={16} /> Preview & print PDF</button>} /><div className="report-toolbar"><div><FileText size={17} /><span>Draft report · {activeCase?.id || 'No active case'}</span></div><span><LockKeyhole size={14} /> Generated locally in your browser</span></div>{activeCase ? <div className="report-sheet"><div className="report-cover"><div><span className="mono-label">TRACE / INVESTIGATION REPORT</span><h2>{activeCase.title}</h2><p>{activeCase.id} · {titleCase(activeCase.status)} · {formatDate(activeCase.date)}</p></div><LogoMark /></div><div className="report-notice"><AlertCircle size={17} /><span><strong>Fictional demonstration record.</strong> This report is not forensic certification or a legal determination. Human review is required for every observation and hypothesis.</span></div><div className="report-section"><span className="panel-eyebrow">01 · Overview</span><h3>Case objective</h3><p>{activeCase.description}</p><p>Organize supplied simulated records, preserve provenance, and identify the next reviewable questions without turning AI output into established fact.</p></div><div className="report-section"><span className="panel-eyebrow">02 · Evidence inventory</span><h3>{evidence.length} linked records</h3><div className="report-table"><div className="report-table-row heading"><span>Record</span><span>Type</span><span>Processing</span><span>Integrity</span></div>{evidence.map((item) => <div className="report-table-row" key={item.id}><span><strong>{item.name}</strong><small>{item.id}</small></span><span>{item.type}</span><span>{item.status === 'processed' ? 'Processed' : 'Metadata only'}</span><span>{item.sha256 === 'manual entry' ? 'Manual record' : 'SHA-256 recorded'}</span></div>)}</div></div><div className="report-section"><span className="panel-eyebrow">03 · Timeline</span><h3>{events.length} recorded events</h3><div className="report-event-list">{events.map((event) => <div key={event.id}><span className={`event-dot ${event.origin}`} /><div><strong>{formatDateTime(event.timestamp)} · {event.title}</strong><p>{event.description}</p><small>{event.source} · {event.origin}</small></div></div>)}</div></div><div className="report-columns"><div className="report-section"><span className="panel-eyebrow">04 · Observations</span><h3>What the record shows</h3><p>{entities.length ? `${entities.length} recorded entities are linked to this case, with ${entities.reduce((sum, entity) => sum + entity.evidenceIds.length, 0)} evidence references.` : 'No entities are linked yet.'}</p><p>Every source timestamp is preserved as recorded. Manual and imported events remain visibly distinct.</p></div><div className="report-section"><span className="panel-eyebrow">05 · AI hypotheses</span><h3>{aiResult ? 'Assistant output available' : 'No hypothesis recorded'}</h3><p>{aiResult ? 'The latest assistant result is available in the case workspace. Review its sources before including it in a final report.' : 'Use the case workspace assistant to create a clearly labeled hypothesis for review.'}</p></div></div><div className="report-section gap-section"><span className="panel-eyebrow">06 · Uncertainties & next steps</span><h3>Questions to carry forward</h3><div className="next-step-grid"><span><b>01</b> Confirm source completeness and preservation.</span><span><b>02</b> Corroborate identities across independent records.</span><span><b>03</b> Document gaps before status changes.</span></div></div><div className="report-section conclusion-section"><span className="panel-eyebrow">07 · Provisional conclusion</span><h3>What this record can support</h3><p>This demonstration record contains {evidence.length} linked evidence items, {events.length} recorded timeline events and {entities.length} associated entities. Those counts describe the workspace only; they do not establish who acted, why an event occurred, attribution, intent or legal significance. Any investigative hypothesis requires independent corroboration and human review.</p></div><div className="report-footer"><span>Generated {formatDateTime(new Date().toISOString())}</span><span>TRACE · local-first investigation workspace</span></div></div> : <EmptyState icon={ClipboardList} title="Select a case before generating a report" text="Open Cases and choose the investigation you want to document." action={<button className="secondary-button" onClick={() => onNavigate('cases')}>Open cases <ArrowRight size={15} /></button>} />}</div>
}

function RecordModal({ modal, cases, evidence, events, onClose, onSaveCase, onSaveEvidence, onSaveEvent, onSaveEntity }: { modal: ModalState; cases: InvestigationCase[]; evidence: EvidenceItem[]; events: TimelineEvent[]; onClose: () => void; onSaveCase: (form: Record<string, string>, existing?: InvestigationCase) => void; onSaveEvidence: (form: Record<string, string>, existing?: EvidenceItem) => void; onSaveEvent: (form: Record<string, string>, existing?: TimelineEvent) => void; onSaveEntity: (form: Record<string, string>, existing?: Entity) => void }) {
  const existing = modal.item as InvestigationCase | EvidenceItem | TimelineEvent | Entity | undefined
  const [form, setForm] = useState<Record<string, string>>((): Record<string, string> => {
    if (modal.kind === 'case') { const item = modal.item as InvestigationCase | undefined; return { title: item?.title || '', description: item?.description || '', category: item?.category || 'Account compromise', priority: item?.priority || 'medium', status: item?.status || 'active', date: item?.date || new Date().toISOString().slice(0, 10) } }
    if (modal.kind === 'evidence') { const item = modal.item as EvidenceItem | undefined; return { name: item?.name || '', type: item?.type || 'NOTE', category: item?.category || 'Investigator note', description: item?.description || '', extractedText: item?.extractedText || '', caseId: item?.caseId || cases[0]?.id || '' } }
    if (modal.kind === 'event') { const item = modal.item as TimelineEvent | undefined; return { title: item?.title || '', timestamp: item?.timestamp ? formatDateTimeInput(item.timestamp) : formatDateTimeInput(new Date().toISOString()), description: item?.description || '', source: item?.source || 'Manual investigator entry', category: item?.category || 'Review', origin: item?.origin || 'manual', evidenceId: item?.evidenceId || '', caseId: item?.caseId || cases[0]?.id || '' } }
    const item = modal.item as Entity | undefined; return { name: item?.name || '', alias: item?.alias || '', type: item?.type || 'person', relationship: item?.relationship || 'recorded association', description: item?.description || '', notes: item?.notes || '', evidenceIds: item?.evidenceIds.join(', ') || '', eventIds: item?.eventIds.join(', ') || '', caseId: item?.caseId || cases[0]?.id || '' }
  })
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }))
  function submit(event: FormEvent) { event.preventDefault(); if (modal.kind === 'case') onSaveCase(form, existing as InvestigationCase | undefined); if (modal.kind === 'evidence') onSaveEvidence(form, existing as EvidenceItem | undefined); if (modal.kind === 'event') onSaveEvent(form, existing as TimelineEvent | undefined); if (modal.kind === 'entity') onSaveEntity(form, existing as Entity | undefined) }
  const title = `${modal.item ? 'Edit' : 'Create'} ${modal.kind === 'case' ? 'case' : modal.kind === 'evidence' ? 'evidence record' : modal.kind === 'event' ? 'timeline event' : 'entity profile'}`
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="record-modal" onSubmit={submit}><div className="modal-header"><div><span className="panel-eyebrow">TRACE / RECORD BUILDER</span><h2>{title}</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={18} /></button></div>{modal.kind === 'case' && <><Field label="Case title" value={form.title} onChange={(value) => set('title', value)} placeholder="e.g. Suspicious Account Access" required /><div className="form-grid"><Field label="Incident category" value={form.category} onChange={(value) => set('category', value)} placeholder="Account compromise" required /><SelectField label="Priority" value={form.priority} onChange={(value) => set('priority', value)} options={['critical', 'high', 'medium', 'low']} /><SelectField label="Status" value={form.status} onChange={(value) => set('status', value)} options={['active', 'review', 'closed']} /><Field label="Incident date" type="date" value={form.date} onChange={(value) => set('date', value)} required /></div><TextAreaField label="Description" value={form.description} onChange={(value) => set('description', value)} placeholder="What is this investigation trying to establish?" /></>}{modal.kind === 'evidence' && <><Field label="Record name" value={form.name} onChange={(value) => set('name', value)} placeholder="manual_review_note" required /><div className="form-grid"><Field label="Type" value={form.type} onChange={(value) => set('type', value)} placeholder="NOTE" /><Field label="Category" value={form.category} onChange={(value) => set('category', value)} placeholder="Investigator note" /><SelectField label="Associated case" value={form.caseId} onChange={(value) => set('caseId', value)} options={cases.map((item) => item.id)} /></div><TextAreaField label="Description" value={form.description} onChange={(value) => set('description', value)} placeholder="Describe what this record represents." /><TextAreaField label="Extracted text / note body" value={form.extractedText} onChange={(value) => set('extractedText', value)} placeholder="Paste text or write the observation here." /></>}{modal.kind === 'event' && <><Field label="Event title" value={form.title} onChange={(value) => set('title', value)} placeholder="New device sign-in" required /><div className="form-grid"><Field label="Recorded timestamp" type="datetime-local" value={form.timestamp} onChange={(value) => set('timestamp', value)} required /><Field label="Source" value={form.source} onChange={(value) => set('source', value)} placeholder="gateway.log" /><Field label="Category" value={form.category} onChange={(value) => set('category', value)} placeholder="Authentication" /><SelectField label="Origin" value={form.origin} onChange={(value) => set('origin', value)} options={['imported', 'manual', 'ai-suggested']} /></div><SelectField label="Related evidence (optional)" value={form.evidenceId} onChange={(value) => set('evidenceId', value)} options={['', ...evidence.map((item) => item.id)]} /><TextAreaField label="Description" value={form.description} onChange={(value) => set('description', value)} placeholder="What is recorded, and what remains unknown?" /></>}{modal.kind === 'entity' && <><Field label="Name or alias" value={form.name} onChange={(value) => set('name', value)} placeholder="Alina Reyes" required /><div className="form-grid"><Field label="Alias" value={form.alias} onChange={(value) => set('alias', value)} placeholder="alina.r" /><SelectField label="Type" value={form.type} onChange={(value) => set('type', value)} options={['person', 'account', 'device', 'organization']} /><Field label="Relationship label" value={form.relationship} onChange={(value) => set('relationship', value)} placeholder="recorded association" /></div><TextAreaField label="Description" value={form.description} onChange={(value) => set('description', value)} placeholder="What does the record say about this entity?" /><TextAreaField label="Review note" value={form.notes} onChange={(value) => set('notes', value)} placeholder="Association is not confirmation…" /><Field label="Evidence IDs (comma separated)" value={form.evidenceIds} onChange={(value) => set('evidenceIds', value)} placeholder="EV-881, EV-882" /><Field label="Timeline IDs (comma separated)" value={form.eventIds} onChange={(value) => set('eventIds', value)} placeholder="TE-1001" /></>}<div className="modal-foot"><span><LockKeyhole size={13} /> Stored locally in this browser</span><div><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Check size={16} /> Save record</button></div></div></form></div>
}
function Field({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) { return <label className="form-field"><span>{label}{required && <b>*</b>}</span><input required={required} type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label> }
function TextAreaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) { return <label className="form-field"><span>{label}</span><textarea rows={3} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label> }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) { return <label className="form-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option ? titleCase(option) : 'None'}</option>)}</select></label> }

export default App
