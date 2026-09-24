import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  Search, 
  Download, 
  Send, 
  Copy, 
  ExternalLink, 
  GraduationCap, 
  Building2, 
  Sparkles, 
  RefreshCw, 
  FileDown, 
  Check,
  ShieldCheck,
  Mail,
  AlertCircle,
  HelpCircle,
  FileCheck2
} from 'lucide-react';
import { consentApi } from '../api/consentApi';

// Sample presets for quick one-click testing
const SAMPLE_CS_STUDENTS_50 = Array.from({ length: 50 }, (_, i) => {
  const num = i + 1;
  const pad = num < 10 ? `0${num}` : `${num}`;
  const firstNames = ['Aarav', 'Ananya', 'Rahul', 'Priya', 'Rohan', 'Sneha', 'Aditya', 'Pooja', 'Vikram', 'Divya', 'Kunal', 'Neha', 'Siddharth', 'Tanvi', 'Arjun', 'Meera', 'Gaurav', 'Riya', 'Ishaan', 'Shreya'];
  const lastNames = ['Sharma', 'Verma', 'Patel', 'Reddy', 'Gupta', 'Singh', 'Nair', 'Kumar', 'Iyer', 'Mehta', 'Joshi', 'Chopra', 'Malhotra', 'Bose', 'Rao', 'Bhat', 'Pandey', 'Saxena', 'Deshmukh', 'Mishra'];
  const fn = firstNames[i % firstNames.length];
  const ln = lastNames[i % lastNames.length];
  return {
    id: `row-${num}`,
    name: `${fn} ${ln}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}${pad}@cs.univ.ac.in`,
    roll_no: `CS-2026-${pad}`,
    department: 'Computer Science & Engineering',
    phone: `+91 98765 ${10000 + num}`,
    valid: true
  };
});

const SAMPLE_IT_STUDENTS_35 = Array.from({ length: 35 }, (_, i) => {
  const num = i + 1;
  const pad = num < 10 ? `0${num}` : `${num}`;
  const names = ['Kavya Sen', 'Varun Kapoor', 'Tanya Roy', 'Manish Agarwal', 'Akash Das', 'Bhavna Menon', 'Deepak Jain', 'Swati Pillai', 'Rajat Tiwari', 'Nisha Yadav'];
  const name = names[i % names.length] + (num > 10 ? ` (${num})` : '');
  const cleanEmail = name.toLowerCase().replace(/[^a-z]/g, '') + `${pad}@it.univ.ac.in`;
  return {
    id: `row-it-${num}`,
    name,
    email: cleanEmail,
    roll_no: `IT-2026-${pad}`,
    department: 'Information Technology',
    phone: `+91 98764 ${20000 + num}`,
    valid: true
  };
});

const SAMPLE_PLACEMENT_60 = Array.from({ length: 60 }, (_, i) => {
  const num = i + 1;
  const pad = num < 10 ? `0${num}` : `${num}`;
  const depts = ['Computer Science', 'Information Tech', 'Electronics & Comm', 'Mechanical Eng', 'Data Science'];
  const dept = depts[i % depts.length];
  return {
    id: `row-place-${num}`,
    name: `Student Candidate ${pad}`,
    email: `candidate.${pad}@placements.univ.ac.in`,
    roll_no: `TPO-2026-${pad}`,
    department: dept,
    phone: `+91 98100 ${30000 + num}`,
    valid: true
  };
});

// Institutional purpose presets
const PURPOSE_PRESETS = [
  {
    id: 'academic_erp',
    label: '🎓 Higher Ed: Student ERP & Academic Transcripts',
    domain: 'Higher Education',
    fiduciaryCategory: 'Educational Institution / University',
    purpose: 'Student Academic Records, University ERP System & Examination Data Processing',
    subject: '[Statutory DPDP Notice] Consent Request: University Academic ERP & Student Records',
    body: 'Dear {{name}} (Roll No: {{roll_no}}),\n\n{{fiduciary_name}} requests your informed digital consent under Section 6 of the DPDP Act 2023 for collecting and processing your academic records, attendance, semester grades, and university ERP identity.\n\nPlease click the secure link below to review the requested data attributes and grant your consent.',
    attributes: [
      { id: 'attr_name', name: 'Full Legal Name', category: 'IDENTITY', required: true, sensitive: false },
      { id: 'attr_roll', name: 'Student Roll Number / Enrollment ID', category: 'IDENTITY', required: true, sensitive: false },
      { id: 'attr_email', name: 'University Official Email', category: 'CONTACT', required: true, sensitive: false },
      { id: 'attr_phone', name: 'Emergency Mobile Contact', category: 'CONTACT', required: false, sensitive: false },
      { id: 'attr_academics', name: 'Academic Transcripts & Grade Sheets', category: 'ACADEMIC', required: false, sensitive: true },
      { id: 'attr_id', name: 'Government ID / Aadhaar / Passport Proof', category: 'KYC', required: true, sensitive: true }
    ]
  },
  {
    id: 'campus_placement',
    label: '💼 Campus Placements & Corporate Internship Profiling',
    domain: 'Campus Placements',
    fiduciaryCategory: 'Higher Education & Career Services',
    purpose: 'Campus Placements, Corporate Recruiter Data Sharing & Internship Opportunity Profiling',
    subject: '[Action Required] DPDP Consent Request: Campus Placement Cell Data Sharing',
    body: 'Dear {{name}} (Branch: {{department}}),\n\nThe Training & Placement Cell of {{fiduciary_name}} requests your statutory consent under the DPDP Act 2023 to verify and share your academic resume, CGPA, and contact credentials with prospective corporate recruiters for campus hiring drives.',
    attributes: [
      { id: 'attr_name', name: 'Full Legal Name', category: 'IDENTITY', required: true, sensitive: false },
      { id: 'attr_roll', name: 'College Roll Number', category: 'IDENTITY', required: true, sensitive: false },
      { id: 'attr_email', name: 'Candidate Email Address', category: 'CONTACT', required: true, sensitive: false },
      { id: 'attr_phone', name: 'Contact Phone Number', category: 'CONTACT', required: true, sensitive: false },
      { id: 'attr_resume', name: 'Verified Placement Resume & Project Portfolio', category: 'PROFILE', required: true, sensitive: false },
      { id: 'attr_gpa', name: 'Official Cumulative CGPA & Marks Transcripts', category: 'ACADEMIC', required: true, sensitive: true }
    ]
  },
  {
    id: 'library_wifi',
    label: '📚 Campus Infrastructure: Digital Library & High-Speed WiFi',
    domain: 'Higher Education',
    fiduciaryCategory: 'University Infrastructure & IT Services',
    purpose: 'Campus High-Speed WiFi Network Authentication & Digital Library Resource Access',
    subject: '[DPDP Notice] Consent Request: University WiFi & Digital Library Access',
    body: 'Dear {{name}},\n\n{{fiduciary_name}} requests your consent under the DPDP Act 2023 to process your network device MAC address, university login, and library borrowing logs to provision access to campus digital resources.',
    attributes: [
      { id: 'attr_name', name: 'Student Name', category: 'IDENTITY', required: true, sensitive: false },
      { id: 'attr_roll', name: 'Student ID / Roll No', category: 'IDENTITY', required: true, sensitive: false },
      { id: 'attr_email', name: 'Student Email Address', category: 'CONTACT', required: true, sensitive: false },
      { id: 'attr_device', name: 'Device MAC Address & WiFi Access Logs', category: 'TECHNICAL', required: false, sensitive: false }
    ]
  },
  {
    id: 'corporate_hr',
    label: '🏢 Corporate HR: Employee Onboarding & PF Verification',
    domain: 'Corporate HR',
    fiduciaryCategory: 'Corporate Employer Fiduciary',
    purpose: 'Employee Onboarding, Payroll Processing & Statutory PF/ESI Regulatory Compliance',
    subject: '[Statutory DPDP Notice] Employee Data Processing Consent: {{fiduciary_name}}',
    body: 'Dear {{name}},\n\n{{fiduciary_name}} requests your informed digital consent under the DPDP Act 2023 for employee onboarding, biometric attendance, payroll processing, and statutory provident fund submission.',
    attributes: [
      { id: 'attr_name', name: 'Full Legal Name', category: 'IDENTITY', required: true, sensitive: false },
      { id: 'attr_id', name: 'Government Identity Proof & PAN Card', category: 'KYC', required: true, sensitive: true },
      { id: 'attr_bank', name: 'Bank Account & Salary Disbursement Details', category: 'FINANCIAL', required: true, sensitive: true },
      { id: 'attr_contact', name: 'Permanent Address & Contact Information', category: 'CONTACT', required: false, sensitive: false }
    ]
  },
  {
    id: 'custom',
    label: '⚙️ Custom Statutory Purpose...',
    domain: 'Higher Education',
    fiduciaryCategory: 'Data Fiduciary',
    purpose: 'Institutional Data Processing and Statutory DPDP Compliance',
    subject: '[Statutory Notice] Digital Personal Data Processing Consent Request',
    body: 'Dear {{name}},\n\n{{fiduciary_name}} requests your digital consent under the DPDP Act 2023 for: {{purpose}}.\n\nPlease review the requested data attributes and provide your consent decision.',
    attributes: [
      { id: 'attr_name', name: 'Full Legal Name', category: 'IDENTITY', required: true, sensitive: false },
      { id: 'attr_email', name: 'Email Address', category: 'CONTACT', required: true, sensitive: false },
      { id: 'attr_contact', name: 'Phone & Address', category: 'CONTACT', required: false, sensitive: false }
    ]
  }
];

export const BulkNoticeDispatcher = ({ user, onDispatched, onSwitchTab }) => {
  // Source Selection: 'file' | 'presets' | 'paste'
  const [sourceType, setSourceType] = useState('presets');
  const [recipients, setRecipients] = useState(SAMPLE_CS_STUDENTS_50);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Manual input textarea
  const [pasteText, setPasteText] = useState('');

  // Consent Configuration
  const [fiduciaryName, setFiduciaryName] = useState(user?.fiduciary_name || 'Delhi Institute of Technology (College of CS)');
  const [fiduciaryEmail, setFiduciaryEmail] = useState(user?.email || 'compliance@dit.univ.ac.in');
  const [selectedPresetId, setSelectedPresetId] = useState('academic_erp');
  const [domain, setDomain] = useState('Higher Education');
  const [purpose, setPurpose] = useState(PURPOSE_PRESETS[0].purpose);
  const [emailSubject, setEmailSubject] = useState(PURPOSE_PRESETS[0].subject);
  const [emailBody, setEmailBody] = useState(PURPOSE_PRESETS[0].body);
  const [requestedAttributes, setRequestedAttributes] = useState(PURPOSE_PRESETS[0].attributes);

  // New Attribute inline adder
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrCategory, setNewAttrCategory] = useState('IDENTITY');
  const [newAttrRequired, setNewAttrRequired] = useState(true);
  const [newAttrSensitive, setNewAttrSensitive] = useState(false);

  // Dispatch Execution State
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchProgress, setDispatchProgress] = useState({ current: 0, total: 0, percent: 0, statusText: '' });
  const [dispatchResult, setDispatchResult] = useState(null);
  const [copiedLinkToken, setCopiedLinkToken] = useState(null);
  const [copiedAllLinks, setCopiedAllLinks] = useState(false);

  // Helper to validate email format
  const isValidEmail = (email) => {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  // Handle Preset Selection
  const handlePurposePresetChange = (presetId) => {
    setSelectedPresetId(presetId);
    const p = PURPOSE_PRESETS.find(item => item.id === presetId);
    if (p) {
      setDomain(p.domain);
      setPurpose(p.purpose);
      setEmailSubject(p.subject);
      setEmailBody(p.body);
      setRequestedAttributes(p.attributes);
    }
  };

  // Parse Excel, CSV, or Text File
  const processUploadedFile = (file) => {
    if (!file) return;
    const fileName = file.name.toLowerCase();
    const reader = new FileReader();

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!rawJson || rawJson.length === 0) {
            alert('The uploaded spreadsheet contains no data rows.');
            return;
          }

          // Map columns intelligently
          const parsed = rawJson.map((row, idx) => {
            const keys = Object.keys(row);
            const findVal = (terms) => {
              const key = keys.find(k => terms.some(t => k.toLowerCase().replace(/[^a-z]/g, '').includes(t)));
              return key ? String(row[key]).trim() : '';
            };

            const name = findVal(['name', 'studentname', 'fullname', 'principal', 'candidate']) || `Student ${idx + 1}`;
            const email = findVal(['email', 'emailaddress', 'mail', 'studentmail']);
            const roll_no = findVal(['roll', 'rollno', 'studentid', 'enrollment', 'id', 'ref']) || `ROLL-${idx + 1}`;
            const department = findVal(['dept', 'department', 'branch', 'course', 'class']) || 'Computer Science';
            const phone = findVal(['phone', 'mobile', 'contact', 'tel']) || '';

            return {
              id: `file-row-${idx + 1}-${Date.now()}`,
              name,
              email,
              roll_no,
              department,
              phone,
              valid: isValidEmail(email)
            };
          });

          setRecipients(parsed);
          setSourceType('file');
          setDispatchResult(null);
        } catch (err) {
          console.error('File parsing error:', err);
          alert(`Failed to parse spreadsheet: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Plain text or doc dump
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          parseAndLoadText(text);
          setSourceType('file');
          setDispatchResult(null);
        } catch (err) {
          console.error('Text parsing error:', err);
          alert(`Failed to parse text document: ${err.message}`);
        }
      };
      reader.readAsText(file);
    }
  };

  // Parse Multi-Line Text / Paste
  const parseAndLoadText = (rawText) => {
    const lines = (rawText || pasteText).split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      alert('Please enter or paste at least one line of student/user data.');
      return;
    }

    const parsed = lines.map((line, idx) => {
      // Support comma, tab, semicolon or pipe separation
      let parts = line.split(/[,\t;|]/).map(p => p.trim());
      let name = '';
      let email = '';
      let roll_no = `ROLL-${idx + 1}`;
      let department = 'Computer Science';
      let phone = '';

      if (parts.length === 1) {
        // Only email or name
        if (isValidEmail(parts[0])) {
          email = parts[0];
          name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        } else {
          name = parts[0];
        }
      } else if (parts.length >= 2) {
        // Name, Email, ...
        if (isValidEmail(parts[1])) {
          name = parts[0];
          email = parts[1];
          roll_no = parts[2] || `ROLL-${idx + 1}`;
          department = parts[3] || 'Computer Science';
          phone = parts[4] || '';
        } else if (isValidEmail(parts[0])) {
          email = parts[0];
          name = parts[1];
          roll_no = parts[2] || `ROLL-${idx + 1}`;
          department = parts[3] || 'Computer Science';
        } else {
          name = parts[0];
          email = parts[1];
        }
      }

      return {
        id: `paste-row-${idx + 1}-${Date.now()}`,
        name: name || `Student ${idx + 1}`,
        email: email || '',
        roll_no,
        department,
        phone,
        valid: isValidEmail(email)
      };
    });

    setRecipients(parsed);
    setDispatchResult(null);
  };

  // Generate 1,000 Mass Simulation Students
  const generate1000Students = () => {
    const count = 1000;
    const branches = ['Computer Science & Engg', 'Information Technology', 'Artificial Intelligence & DS', 'Electronics & Comm'];
    const generated = Array.from({ length: count }, (_, i) => {
      const num = i + 1;
      const pad = String(num).padStart(4, '0');
      const branch = branches[i % branches.length];
      const prefix = branch.includes('Computer') ? 'CS' : (branch.includes('Info') ? 'IT' : (branch.includes('Artif') ? 'AI' : 'ECE'));
      return {
        id: `sim-1000-${num}`,
        name: `Student Candidate ${pad}`,
        email: `student.${prefix.toLowerCase()}.${pad}@univ.ac.in`,
        roll_no: `${prefix}-2026-${pad}`,
        department: branch,
        phone: `+91 98000 ${pad}`,
        valid: true
      };
    });
    setRecipients(generated);
    setSourceType('presets');
    setDispatchResult(null);
  };

  // Download Sample Excel Template
  const downloadSampleExcel = () => {
    const sampleData = [
      { 'Student Name': 'Rahul Verma', 'Official Email': 'rahul.verma@cs.univ.ac.in', 'Roll Number': 'CS-2026-001', 'Department': 'Computer Science', 'Mobile Phone': '+91 98765 43210' },
      { 'Student Name': 'Ananya Sen', 'Official Email': 'ananya.sen@cs.univ.ac.in', 'Roll Number': 'CS-2026-002', 'Department': 'Computer Science', 'Mobile Phone': '+91 98765 43211' },
      { 'Student Name': 'Aditya Kumar', 'Official Email': 'aditya.kumar@cs.univ.ac.in', 'Roll Number': 'CS-2026-003', 'Department': 'Computer Science', 'Mobile Phone': '+91 98765 43212' },
      { 'Student Name': 'Priya Sharma', 'Official Email': 'priya.sharma@cs.univ.ac.in', 'Roll Number': 'CS-2026-004', 'Department': 'Computer Science', 'Mobile Phone': '+91 98765 43213' },
      { 'Student Name': 'Rohan Gupta', 'Official Email': 'rohan.gupta@it.univ.ac.in', 'Roll Number': 'IT-2026-001', 'Department': 'Information Technology', 'Mobile Phone': '+91 98765 43214' }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student_Consent_Roster');
    XLSX.writeFile(wb, 'DPDP_Student_Consent_Roster_Template.xlsx');
  };

  // Download Sample CSV Template
  const downloadSampleCSV = () => {
    const csvContent = "Student Name,Official Email,Roll Number,Department,Mobile Phone\n" +
      "Rahul Verma,rahul.verma@cs.univ.ac.in,CS-2026-001,Computer Science,+91 98765 43210\n" +
      "Ananya Sen,ananya.sen@cs.univ.ac.in,CS-2026-002,Computer Science,+91 98765 43211\n" +
      "Aditya Kumar,aditya.kumar@cs.univ.ac.in,CS-2026-003,Computer Science,+91 98765 43212\n" +
      "Priya Sharma,priya.sharma@cs.univ.ac.in,CS-2026-004,Computer Science,+91 98765 43213\n" +
      "Rohan Gupta,rohan.gupta@it.univ.ac.in,IT-2026-001,Information Technology,+91 98765 43214\n";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'DPDP_Student_Consent_Roster_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Remove individual row
  const removeRow = (id) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
  };

  // Add Manual Row
  const addEmptyRow = () => {
    const newId = `manual-row-${Date.now()}`;
    setRecipients(prev => [
      {
        id: newId,
        name: '',
        email: '',
        roll_no: `CS-2026-${prev.length + 1}`,
        department: 'Computer Science',
        phone: '',
        valid: false
      },
      ...prev
    ]);
  };

  // Toggle attribute
  const toggleAttribute = (attrId) => {
    setRequestedAttributes(prev => {
      const exists = prev.find(a => a.id === attrId);
      if (exists) {
        if (prev.length <= 1) {
          alert('At least one data attribute must be requested.');
          return prev;
        }
        return prev.filter(a => a.id !== attrId);
      }
      return prev;
    });
  };

  // Add Custom Attribute
  const handleAddAttribute = (e) => {
    e.preventDefault();
    if (!newAttrName.trim()) return;
    const attrId = `attr_custom_${Date.now()}`;
    setRequestedAttributes(prev => [
      ...prev,
      {
        id: attrId,
        name: newAttrName.trim(),
        category: newAttrCategory,
        required: newAttrRequired,
        sensitive: newAttrSensitive
      }
    ]);
    setNewAttrName('');
  };

  // Export Results Manifest CSV
  const exportManifestCSV = () => {
    if (!dispatchResult || !dispatchResult.results) return;
    const rows = dispatchResult.results.map(r => ({
      'Notice ID': r.notice_id,
      'Student Name': r.principal_name,
      'Email Address': r.principal_email,
      'Roll Number': r.roll_no || '',
      'Department': r.department || '',
      'Status': r.status,
      'Consent Portal Link': r.consent_link,
      'Email Sent': r.email_sent ? 'YES' : 'NO',
      'Email Delivery Mode': r.email_dev_mode ? 'Dev Console' : 'SMTP/Resend'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dispatch_Manifest');
    XLSX.writeFile(wb, `DPDP_Bulk_Dispatch_Manifest_${dispatchResult.batch_id || Date.now()}.xlsx`);
  };

  // Copy all consent links
  const copyAllLinks = () => {
    if (!dispatchResult || !dispatchResult.results) return;
    const allLinksText = dispatchResult.results.map(r => `${r.principal_name} (${r.principal_email}): ${r.consent_link}`).join('\n');
    navigator.clipboard.writeText(allLinksText);
    setCopiedAllLinks(true);
    setTimeout(() => setCopiedAllLinks(false), 2500);
  };

  // Copy single link
  const copySingleLink = (link, token) => {
    navigator.clipboard.writeText(link);
    setCopiedLinkToken(token);
    setTimeout(() => setCopiedLinkToken(null), 2000);
  };

  // Filtered Recipients for live preview
  const validRecipients = recipients.filter(r => r.valid);
  const invalidRecipients = recipients.filter(r => !r.valid);
  const filteredRecipients = recipients.filter(r => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(term)) ||
      (r.email && r.email.toLowerCase().includes(term)) ||
      (r.roll_no && r.roll_no.toLowerCase().includes(term)) ||
      (r.department && r.department.toLowerCase().includes(term))
    );
  });

  // 🚀 MAIN EXECUTION: Bulk Dispatch
  const handleBulkDispatch = async () => {
    if (validRecipients.length === 0) {
      alert('No valid student/user email addresses found. Please add or upload recipients with valid email addresses.');
      return;
    }

    const confirmMsg = `🚀 Ready to dispatch DPDP statutory consent notices to ${validRecipients.length} students/users?\n\n• Fiduciary: ${fiduciaryName}\n• Purpose: ${purpose}\n• Number of Attributes: ${requestedAttributes.length}\n\nEach student will receive a unique cryptographic token and personalized consent notice link.`;
    if (!window.confirm(confirmMsg)) return;

    setIsDispatching(true);
    setDispatchResult(null);

    // Chunk recipients into batches of 50 for smooth progress updates
    const CHUNK_SIZE = 50;
    const totalCount = validRecipients.length;
    let successfulAll = [];
    let errorsAll = [];
    let batchId = `BATCH-${Date.now()}`;

    setDispatchProgress({
      current: 0,
      total: totalCount,
      percent: 0,
      statusText: `Initializing bulk cryptographic notice generation for ${totalCount} recipients...`
    });

    try {
      for (let i = 0; i < validRecipients.length; i += CHUNK_SIZE) {
        const chunk = validRecipients.slice(i, i + CHUNK_SIZE);
        const currentProcessed = i;

        setDispatchProgress({
          current: currentProcessed,
          total: totalCount,
          percent: Math.round((currentProcessed / totalCount) * 100),
          statusText: `Dispatching batch ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk.length} students) — sending DPDP invites...`
        });

        const payload = {
          fiduciary_name: fiduciaryName,
          fiduciary_category: 'Higher Education / Educational Institution',
          fiduciary_logo: '🎓',
          fiduciary_email: fiduciaryEmail,
          dpo_name: 'Data Protection Officer (DPO)',
          dpo_email: `dpo@${fiduciaryEmail.split('@')[1] || 'univ.ac.in'}`,
          purpose: purpose,
          domain: domain,
          legal_basis: 'Consent under DPDP Act 2023 (Section 6)',
          validity_period: '12 Months',
          data_region: 'India',
          requested_attributes: requestedAttributes,
          email_subject: emailSubject,
          email_body_template: emailBody,
          attachment_name: 'Statutory_Privacy_Notice.pdf',
          recipients: chunk.map(c => ({
            name: c.name,
            email: c.email,
            roll_no: c.roll_no,
            department: c.department,
            phone: c.phone
          }))
        };

        const res = await consentApi.createBulkConsentRequests(payload);
        if (res && res.results) {
          successfulAll = [...successfulAll, ...res.results];
        }
        if (res && res.errors) {
          errorsAll = [...errorsAll, ...res.errors];
        }
        if (res && res.batch_id) {
          batchId = res.batch_id;
        }

        // Small pause between chunks to let UI breathe
        if (i + CHUNK_SIZE < validRecipients.length) {
          await new Promise(r => setTimeout(r, 100));
        }
      }

      setDispatchProgress({
        current: totalCount,
        total: totalCount,
        percent: 100,
        statusText: `✅ Bulk notice dispatch complete! Successfully processed ${successfulAll.length} notices.`
      });

      const finalResult = {
        success: true,
        batch_id: batchId,
        total: totalCount,
        successful: successfulAll.length,
        failed: errorsAll.length,
        purpose: purpose,
        results: successfulAll,
        errors: errorsAll
      };

      setDispatchResult(finalResult);

      if (onDispatched) {
        onDispatched();
      }
    } catch (err) {
      console.error('Bulk dispatch error:', err);
      alert(`Bulk dispatch failed: ${err.message}`);
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
        border: '1px solid var(--border-highlight)',
        borderRadius: '20px',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)',
            flexShrink: 0
          }}>
            <Sparkles size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.28rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Automated Bulk DPDP Consent Dispatcher
              </h2>
              <span style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                Sec 6 Notice Automation
              </span>
              <span style={{
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(99, 102, 241, 0.3)'
              }}>
                Higher Ed & Enterprise
              </span>
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Upload an Excel roster or select student batches (e.g. 1000 CS branch students) to generate cryptographically signed DPDP notices and dispatch consent invitations automatically.
            </p>
          </div>
        </div>

        {/* Quick Sample Downloads */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={downloadSampleExcel}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '8px 12px' }}
            title="Download formatted Excel spreadsheet template with sample columns"
          >
            <FileSpreadsheet size={14} color="#10b981" />
            <span>Sample Excel Template (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={downloadSampleCSV}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '8px 12px' }}
            title="Download CSV template"
          >
            <FileText size={14} color="#3b82f6" />
            <span>Sample CSV Template (.csv)</span>
          </button>
        </div>
      </div>

      {/* DISPATCH PROGRESS MODAL / BANNER IF ACTIVE */}
      {isDispatching && (
        <div style={{
          background: 'var(--bg-card)',
          border: '2px solid var(--accent-primary)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--shadow-modal)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>
                Dispatching Automated Consent Notices...
              </span>
            </div>
            <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '1.1rem' }}>
              {dispatchProgress.percent}%
            </span>
          </div>

          <div style={{ width: '100%', height: '10px', background: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ width: `${dispatchProgress.percent}%`, height: '100%', background: 'var(--accent-gradient)', transition: 'width 0.3s ease' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <span>{dispatchProgress.statusText}</span>
            <span>{dispatchProgress.current} / {dispatchProgress.total} recipients</span>
          </div>
        </div>
      )}

      {/* DISPATCH RESULTS CARD (IF COMPLETED) */}
      {dispatchResult && !isDispatching && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={24} color="#10b981" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Bulk Notice Dispatch Successful!
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Batch Reference: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>{dispatchResult.batch_id}</code> &middot; Purpose: {dispatchResult.purpose}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={copyAllLinks}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                {copiedAllLinks ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                <span>{copiedAllLinks ? 'All Links Copied!' : 'Copy All Notice Links'}</span>
              </button>
              <button
                type="button"
                onClick={exportManifestCSV}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                <FileDown size={14} />
                <span>Export Manifest Report (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => onSwitchTab && onSwitchTab('requests')}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '0.8rem', padding: '6px 14px' }}
              >
                <span>View Dispatched Requests Table &rarr;</span>
              </button>
            </div>
          </div>

          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>DISPATCHED SUCCESSFULLY</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{dispatchResult.successful}</div>
            </div>
            <div style={{ background: 'var(--bg-card-subtle)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL RECIPIENTS</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>{dispatchResult.total}</div>
            </div>
            <div style={{ background: dispatchResult.failed > 0 ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-card-subtle)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>FAILED / SKIPPED</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: dispatchResult.failed > 0 ? '#ef4444' : 'var(--text-primary)', marginTop: '2px' }}>{dispatchResult.failed}</div>
            </div>
          </div>

          {/* Quick Notice Links Table Preview */}
          <div style={{ maxHeight: '260px', overflowY: 'auto', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <table className="custom-table" style={{ fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th>Notice ID</th>
                  <th>Data Principal / Student</th>
                  <th>Roll / Dept</th>
                  <th>Email Delivery Status</th>
                  <th>Direct Link</th>
                </tr>
              </thead>
              <tbody>
                {dispatchResult.results.slice(0, 15).map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.notice_id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.principal_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.principal_email}</div>
                    </td>
                    <td>
                      <div>{r.roll_no || '—'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.department}</div>
                    </td>
                    <td>
                      <span className={`status-pill ${r.email_sent ? 'pill-emerald' : 'pill-amber'}`} style={{ fontSize: '0.72rem' }}>
                        {r.email_sent ? (r.email_dev_mode ? '● Console Dev Mode' : '● Sent via Email') : '● Link Ready'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => copySingleLink(r.consent_link, r.token)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                        >
                          {copiedLinkToken === r.token ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                          <span>{copiedLinkToken === r.token ? 'Copied' : 'Copy'}</span>
                        </button>
                        <a
                          href={r.consent_link}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: '0.72rem', color: 'var(--accent-primary)' }}
                          title="Open Consent Decision Portal"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dispatchResult.results.length > 15 && (
              <div style={{ padding: '8px 16px', textAlign: 'center', background: 'var(--bg-card-subtle)', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Showing first 15 of {dispatchResult.results.length} dispatched notices. Export the complete Excel manifest report above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TWO-COLUMN WORKFLOW BUILDER: RECIPIENT SOURCE & NOTICE CONFIGURATION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>
        
        {/* COLUMN 1: RECIPIENT SOURCE & ROSTER PREVIEW */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '18px',
          border: '1px solid var(--border-color)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-primary)', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                1
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Select or Upload Recipient Cohort
              </h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
              Choose a department preset, upload an Excel/Doc roster, or paste raw emails.
            </p>
          </div>

          {/* Source Selector Tabs */}
          <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-card-subtle)', padding: '4px', borderRadius: '12px' }}>
            <button
              type="button"
              onClick={() => setSourceType('presets')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: sourceType === 'presets' ? 'var(--bg-card)' : 'transparent',
                color: sourceType === 'presets' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                boxShadow: sourceType === 'presets' ? 'var(--shadow-xs)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <GraduationCap size={15} />
              <span>Dept Presets</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceType('file')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: sourceType === 'file' ? 'var(--bg-card)' : 'transparent',
                color: sourceType === 'file' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                boxShadow: sourceType === 'file' ? 'var(--shadow-xs)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <FileSpreadsheet size={15} />
              <span>Upload File (.xlsx / .doc)</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceType('paste')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: sourceType === 'paste' ? 'var(--bg-card)' : 'transparent',
                color: sourceType === 'paste' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                boxShadow: sourceType === 'paste' ? 'var(--shadow-xs)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <FileText size={15} />
              <span>Direct Paste</span>
            </button>
          </div>

          {/* TAB CONTENT: DEPT PRESETS */}
          {sourceType === 'presets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                ONE-CLICK COLLEGE / DEPARTMENT ROSTERS:
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => { setRecipients(SAMPLE_CS_STUDENTS_50); setDispatchResult(null); }}
                  className="btn btn-secondary"
                  style={{ textAlign: 'left', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>🎓 CS Department</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Batch 2026 &middot; 50 Students</div>
                </button>

                <button
                  type="button"
                  onClick={() => { setRecipients(SAMPLE_IT_STUDENTS_35); setDispatchResult(null); }}
                  className="btn btn-secondary"
                  style={{ textAlign: 'left', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>💻 IT Department</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Batch 2026 &middot; 35 Students</div>
                </button>

                <button
                  type="button"
                  onClick={() => { setRecipients(SAMPLE_PLACEMENT_60); setDispatchResult(null); }}
                  className="btn btn-secondary"
                  style={{ textAlign: 'left', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>💼 Placement Cell</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>All Branches &middot; 60 Students</div>
                </button>

                <button
                  type="button"
                  onClick={generate1000Students}
                  className="btn btn-secondary"
                  style={{ textAlign: 'left', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '2px', border: '1px dashed var(--accent-primary)' }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--accent-primary)' }}>⚡ 1,000 CS Students</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mass Cohort Simulator</div>
                </button>
              </div>
            </div>
          )}

          {/* TAB CONTENT: FILE UPLOAD */}
          {sourceType === 'file' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.docx,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    processUploadedFile(e.target.files[0]);
                  }
                }}
                style={{ display: 'none' }}
              />

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    processUploadedFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                style={{
                  border: isDragging ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-color)',
                  background: isDragging ? 'var(--accent-soft)' : 'var(--bg-card-subtle)',
                  borderRadius: '14px',
                  padding: '30px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-soft)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Upload size={24} />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Click to select or drag & drop Excel / Doc file
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Supported formats: Microsoft Excel (<strong>.xlsx, .xls</strong>), CSV (<strong>.csv</strong>), Word/Text (<strong>.docx, .txt</strong>)
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: DIRECT PASTE */}
          {sourceType === 'paste' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Paste lines formatted as <code>Name, Email, RollNo, Department</code> or one email address per line:
              </div>
              <textarea
                rows={4}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={"Rahul Verma, rahul.verma@cs.univ.ac.in, CS-2026-001, Computer Science\nAnanya Sen, ananya.sen@cs.univ.ac.in, CS-2026-002, Computer Science\nAditya Kumar, aditya.kumar@cs.univ.ac.in, CS-2026-003, Computer Science"}
                className="form-textarea"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
              />
              <button
                type="button"
                onClick={() => parseAndLoadText()}
                className="btn btn-secondary btn-sm"
                style={{ alignSelf: 'flex-end', fontSize: '0.8rem' }}
              >
                <RefreshCw size={13} />
                <span>Parse & Update Roster</span>
              </button>
            </div>
          )}

          {/* ROSTER PREVIEW TABLE */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  Loaded Roster ({recipients.length})
                </span>
                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                  {validRecipients.length} Valid
                </span>
                {invalidRecipients.length > 0 && (
                  <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                    {invalidRecipients.length} Invalid
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={addEmptyRow}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '4px 8px' }}
                >
                  <Plus size={12} />
                  <span>Add Row</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRecipients([])}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '4px 8px', color: '#ef4444' }}
                >
                  <Trash2 size={12} />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Quick Search */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter by student name, roll number, or email..."
                className="form-input"
                style={{ paddingLeft: '32px', fontSize: '0.8rem', height: '34px' }}
              />
            </div>

            {/* Scrollable table */}
            <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <table className="custom-table" style={{ fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Email Address</th>
                    <th>Roll / ID</th>
                    <th>Dept / Branch</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecipients.slice(0, 100).map((r, i) => (
                    <tr key={r.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.name || '—'}</td>
                      <td>
                        <span style={{ color: r.valid ? 'var(--text-secondary)' : '#ef4444' }}>
                          {r.email || 'Missing email'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{r.roll_no || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{r.department || '—'}</td>
                      <td>
                        <span className={`status-pill ${r.valid ? 'pill-emerald' : 'pill-rose'}`} style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                          {r.valid ? 'Valid' : 'Invalid'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeRow(r.id)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                          title="Remove student"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredRecipients.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                        No matching recipients found in roster.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {filteredRecipients.length > 100 && (
                <div style={{ padding: '6px 12px', textAlign: 'center', background: 'var(--bg-card-subtle)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Showing first 100 of {filteredRecipients.length} recipients. All will be dispatched.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMN 2: NOTICE PURPOSE & ATTRIBUTE CONFIGURATION */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '18px',
          border: '1px solid var(--border-color)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent-primary)', fontWeight: 800, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                2
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Notice Purpose & Requested Attributes
              </h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
              Specify the legal processing purpose under Section 6 of the DPDP Act 2023.
            </p>
          </div>

          {/* Fiduciary / Organization Name */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>
              Data Fiduciary / Institution Name
            </label>
            <input
              type="text"
              value={fiduciaryName}
              onChange={(e) => setFiduciaryName(e.target.value)}
              placeholder="e.g. Delhi Institute of Technology - Department of Computer Science"
              className="form-input"
            />
          </div>

          {/* Purpose Preset Selector */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>
              Statutory Purpose Template Preset
            </label>
            <select
              value={selectedPresetId}
              onChange={(e) => handlePurposePresetChange(e.target.value)}
              className="form-select"
              style={{ fontSize: '0.84rem' }}
            >
              {PURPOSE_PRESETS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Detailed Purpose Textarea */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem' }}>
              Processing Purpose Statement (Shown on DPDP Notice Certificate)
            </label>
            <textarea
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="form-textarea"
              style={{ fontSize: '0.82rem' }}
            />
          </div>

          {/* Requested Attributes Checkbox List */}
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Requested Data Attributes ({requestedAttributes.length})</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Click to toggle</span>
            </label>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              {requestedAttributes.map(attr => (
                <div
                  key={attr.id}
                  onClick={() => toggleAttribute(attr.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'var(--accent-soft)',
                    border: '1px solid var(--border-highlight)',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--accent-primary)'
                  }}
                  title="Click to remove attribute"
                >
                  <CheckCircle2 size={13} color="var(--accent-primary)" />
                  <span>{attr.name}</span>
                  {attr.sensitive && (
                    <span style={{ fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '1px 4px', borderRadius: '4px' }}>
                      Sensitive
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Add Custom Attribute Row */}
            <form onSubmit={handleAddAttribute} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newAttrName}
                onChange={(e) => setNewAttrName(e.target.value)}
                placeholder="Add custom attribute (e.g. Hostel Room No)..."
                className="form-input"
                style={{ fontSize: '0.78rem', height: '32px' }}
              />
              <button
                type="submit"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.76rem', padding: '0 12px', height: '32px' }}
              >
                <Plus size={13} />
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* Personalization Merge Tags Helper */}
          <div style={{ background: 'var(--bg-card-subtle)', borderRadius: '12px', padding: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Dynamic Merge Variables Supported:
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '0.72rem' }}>
              <code style={{ background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{`{{name}}`}</code>
              <code style={{ background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{`{{roll_no}}`}</code>
              <code style={{ background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{`{{department}}`}</code>
              <code style={{ background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{`{{fiduciary_name}}`}</code>
              <code style={{ background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>{`{{purpose}}`}</code>
            </div>
          </div>

          {/* PROMINENT BULK DISPATCH CTA */}
          <button
            type="button"
            onClick={handleBulkDispatch}
            disabled={isDispatching || validRecipients.length === 0}
            className="btn btn-primary"
            style={{
              padding: '14px 20px',
              fontSize: '0.96rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 18px rgba(99, 102, 241, 0.35)',
              opacity: (isDispatching || validRecipients.length === 0) ? 0.6 : 1,
              cursor: (isDispatching || validRecipients.length === 0) ? 'not-allowed' : 'pointer',
              marginTop: '4px'
            }}
          >
            <Send size={18} />
            <span>
              {isDispatching
                ? `Dispatching Notices (${dispatchProgress.current}/${dispatchProgress.total})...`
                : `Dispatch Automated DPDP Notices to all ${validRecipients.length} Students`}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
