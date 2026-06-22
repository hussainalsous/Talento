#!/usr/bin/env python3
"""
Builds a single unified n8n workflow JSON from the three TALENTO pipelines,
with all integration fixes applied. Output: TALENTO-Unified-Pipeline.json

Fixes baked in:
  1. CV "Download file" uses the triggering file id (was hardcoded resume2.pdf).
  2. Job "Build & Validate" uses Laravel's prebuilt text_to_embed (was rebuilding
     from description/requirements/responsibilities that Laravel never sends).
  3. CV->Job match callback sends X-N8N-Webhook-Secret (was 401 on /api/n8n/*).
  4. Single unified Error Trigger -> one secret-guarded /api/n8n/log-error.
  5. CV pipeline now auto-triggers CV->Job matching after all chunks are upserted
     (the previously orphaned /cv-match flow is wired in-process + still webhook-able).
  6. One consistent bearer token + webhook secret across every Laravel call.
"""
import json

TOKEN = "1|36Q6qj4mAa9vVRKsX6zV2UFOq8BaDwrknDbEAUGf30bddb64"  # verify: WF1 used ...q8.., WF2/3 used ...k8..
SECRET = "talento-secret-2026"
BASE = "http://host.docker.internal:8000"
QDRANT = "http://host.docker.internal:6333"

GDRIVE_CRED = {"googleDriveOAuth2Api": {"id": "iGUOI5mKcNHt0PfW", "name": "Google Drive account"}}
MISTRAL_CRED = {"mistralCloudApi": {"id": "UZ2giX82UM1hUCPZ", "name": "Mistral Cloud account"}}
GEMINI_CRED = {"googlePalmApi": {"id": "wICjhgEuc7ogThGA", "name": "Google Gemini(PaLM) Api account"}}
BEARER_CRED = {"httpBearerAuth": {"id": "t8ZylFsOh1f68Ps8", "name": "Bearer Auth account"}}


def laravel_headers(secret=False):
    params = [
        {"name": "Authorization", "value": f"=Bearer {TOKEN}"},
        {"name": "Accept", "value": "application/json"},
        {"name": "Content-Type", "value": "application/json"},
    ]
    if secret:
        params.append({"name": "X-N8N-Webhook-Secret", "value": SECRET})
    return {"parameters": {"parameters": params}}


nodes = []
conns = {}


def node(name, ntype, typeVersion, pos, params, *, credentials=None, extra=None):
    n = {
        "parameters": params,
        "id": f"node-{len(nodes):02d}",
        "name": name,
        "type": ntype,
        "typeVersion": typeVersion,
        "position": pos,
    }
    if credentials:
        n["credentials"] = credentials
    if extra:
        n.update(extra)
    nodes.append(n)
    return name


def link(src, dst, src_type="main", dst_type="main", index=0):
    conns.setdefault(src, {}).setdefault(src_type, [])
    arr = conns[src][src_type]
    while len(arr) <= index:
        arr.append([])
    arr[index].append({"node": dst, "type": dst_type, "index": 0})


def secret_gate(name, pos, cond_id):
    """IF node that passes only when the inbound webhook carries the correct
    X-N8N-Webhook-Secret header. Output 0 = authorized, output 1 = rejected."""
    return node(name, "n8n-nodes-base.if", 2.2, pos, {
        "conditions": {
            "options": {"caseSensitive": True, "typeValidation": "loose", "version": 2},
            "conditions": [{
                "id": cond_id,
                # Coerce a missing header to '' so a no-secret request reliably
                # evaluates false (→ 401) instead of erroring on undefined.
                "leftValue": "={{ ($json.headers && $json.headers['x-n8n-webhook-secret']) || '' }}",
                "rightValue": SECRET,
                "operator": {"type": "string", "operation": "equals"},
            }],
            "combinator": "and",
        },
        "options": {},
    })


def respond_401(name, pos):
    return node(name, "n8n-nodes-base.respondToWebhook", 1.1, pos, {
        "respondWith": "json",
        "responseBody": '={ "error": "Invalid or missing webhook secret" }',
        "options": {"responseCode": 401},
    })


# ===========================================================================
# STICKY NOTES
# ===========================================================================
node("Sticky: Title", "n8n-nodes-base.stickyNote", 1, [-80, -340], {
    "content": "# TALENTO — Unified CV & Job Matching Pipeline\n\nThree pipelines merged into one workflow:\n- **Lane A** — CV ingestion (Google Drive → embed → Qdrant + Laravel) → auto-matches the new candidate against open jobs\n- **Lane B** — Job published (Laravel webhook → embed → Qdrant → match candidates)\n- **Lane C** — CV → Job matching (shared; reachable from Lane A or the /cv-match webhook)\n- **Lane E** — Unified error handling → /api/n8n/log-error",
    "height": 260, "width": 760, "color": 6})
node("Sticky: Lane A", "n8n-nodes-base.stickyNote", 1, [240, -240], {
    "content": "## Lane A — CV Ingestion", "height": 700, "width": 2360, "color": 7})
node("Sticky: Lane C", "n8n-nodes-base.stickyNote", 1, [240, 600], {
    "content": "## Lane C — CV → Job Matching (shared)", "height": 360, "width": 2360, "color": 4})
node("Sticky: Lane B", "n8n-nodes-base.stickyNote", 1, [240, 1020], {
    "content": "## Lane B — Job Published → Embed + Match", "height": 360, "width": 2160, "color": 5})
node("Sticky: Lane E", "n8n-nodes-base.stickyNote", 1, [240, 1420], {
    "content": "## Lane E — Unified Error Handling", "height": 220, "width": 760, "color": 3})

# ===========================================================================
# LANE A — CV INGESTION
# ===========================================================================
A_TRIGGER = node("Google Drive Trigger", "n8n-nodes-base.googleDriveTrigger", 1, [320, 0], {
    "pollTimes": {"item": [{"mode": "everyMinute"}]},
    "triggerOn": "specificFolder",
    "folderToWatch": {
        "__rl": True,
        "value": "1hmfFOij2HfnfTxZf_tpcDUcHcpCa0prf",
        "mode": "list",
        "cachedResultName": "talento_resume",
        "cachedResultUrl": "https://drive.google.com/drive/folders/1hmfFOij2HfnfTxZf_tpcDUcHcpCa0prf",
    },
    "event": "fileCreated",
    "options": {},
}, credentials=GDRIVE_CRED)

A_META = node("Set: File Metadata", "n8n-nodes-base.set", 3.4, [540, 0], {
    "assignments": {"assignments": [
        {"id": "meta-001", "name": "candidateId", "value": "={{ $json.id }}", "type": "string"},
        {"id": "meta-002", "name": "fileName", "value": "={{ $json.name }}", "type": "string"},
        {"id": "meta-003", "name": "mimeType", "value": "={{ $json.mimeType }}", "type": "string"},
        {"id": "meta-004", "name": "uploadedAt", "value": "={{ new Date().toISOString() }}", "type": "string"},
    ]},
    "options": {},
})

# FIX #1: download the file that actually triggered the workflow.
A_DL = node("Download file", "n8n-nodes-base.googleDrive", 3, [760, 0], {
    "operation": "download",
    "fileId": {"__rl": True, "value": "={{ $json.candidateId }}", "mode": "id"},
    "options": {},
}, credentials=GDRIVE_CRED)

A_OCR = node("Extract CV Text", "n8n-nodes-base.mistralAi", 1, [980, 0], {
    "binaryProperty": "=data", "options": {},
}, credentials=MISTRAL_CRED)

CV_PROMPT = r'''=You are an advanced CV and resume extraction engine.

Your task is to analyze OCR extracted CV text and return a clean, structured JSON object, and Generate a professional CV summary covering all aspects of the CV in this summary then add it in a JSON field the is labeled by "cv_summary".

Follow these rules:
- Extract only information that is explicitly present in the text
- Do not hallucinate or invent missing data
- Normalize formatting and remove OCR noise such as headers, footers, and page numbers
- Return only valid JSON with no markdown, no explanation, and no extra text
- Use null for missing values and empty arrays when no data exists
- Keep job titles, company names, degrees, and certifications in original wording
- Format dates in ISO style when possible (YYYY-MM-DD)

Rules for extraction:
Only extract real information from the CV text. Do not guess missing values. Ignore decorative text, repeated OCR artifacts, and irrelevant content. Group information into the correct sections and keep the structure clean and consistent.

CV TEXT:
{{ $json.extractedText }}'''

A_CLASSIFY = node("CV classification", "@n8n/n8n-nodes-langchain.agent", 3.1, [1200, 0], {
    "promptType": "define", "text": CV_PROMPT, "hasOutputParser": True, "options": {},
}, extra={"retryOnFail": True})

# FIX (cosmetic/robustness): use a current Gemini model id (was models/gemini-3.5-flash).
A_GEMINI = node("Google Gemini Chat Model", "@n8n/n8n-nodes-langchain.lmChatGoogleGemini", 1.1, [1140, 240], {
    "modelName": "models/gemini-2.0-flash", "options": {},
}, credentials=GEMINI_CRED)

A_AUTOFIX = node("Auto-fixing Output Parser", "@n8n/n8n-nodes-langchain.outputParserAutofixing", 1, [1340, 240], {"options": {}})

A_MISTRAL_CHAT = node("Mistral Cloud Chat Model", "@n8n/n8n-nodes-langchain.lmChatMistralCloud", 1, [1280, 460], {
    "model": "voxtral-small-latest", "options": {},
}, credentials=MISTRAL_CRED)

CV_SCHEMA = '''{
  "type": "object",
  "properties": {
    "personal_information": {
      "type": "object",
      "properties": {
        "full_name": { "type": "string" },
        "headline": { "type": "string" },
        "email": { "type": "string" },
        "location": {
          "type": "object",
          "properties": {
            "country": { "type": "string" },
            "city": { "type": "string" }
          },
          "required": ["country", "city"]
        },
        "links": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["full_name", "headline", "email", "location", "links"]
    },
    "summary": { "type": "string" },
    "skills": { "type": "array", "items": { "type": "string" } },
    "languages": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "language": { "type": "string" },
          "proficiency": { "type": "string" }
        },
        "required": ["language", "proficiency"]
      }
    },
    "experience": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "job_title": { "type": "string" },
          "highlights": { "type": "array", "items": { "type": "string" } },
          "company": { "type": "string" },
          "location": { "type": "string" },
          "start_date": { "type": "string" },
          "end_date": { "type": "string" },
          "description": { "type": "string" }
        },
        "required": ["job_title", "highlights", "company", "location", "start_date", "end_date", "description"]
      }
    },
    "education": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "degree": { "type": "string" },
          "institution": { "type": "string" },
          "location": { "type": "string" },
          "start_date": { "type": "string" },
          "end_date": { "type": "string" }
        },
        "required": ["degree", "institution", "location", "start_date", "end_date"]
      }
    },
    "certifications": { "type": "array", "items": { "type": "string" } },
    "cv_summary": { "type": "string" }
  },
  "required": ["personal_information", "summary", "skills", "languages", "experience", "education", "certifications", "cv_summary"]
}'''

A_STRUCT = node("Structured Output Parser", "@n8n/n8n-nodes-langchain.outputParserStructured", 1.3, [1480, 460], {
    "schemaType": "manual", "inputSchema": CV_SCHEMA})

A_EXTRACT_CODE = r'''// INPUT: AI agent output parsed as JSON. Grab structured CV object.
const raw = $input.first().json;
const cv = raw.output || raw;

if (!cv || typeof cv !== 'object') {
  throw new Error('CV data is missing or not an object. Check the AI agent output.');
}

// candidate_id = Google Drive file id captured at the start of the run.
let candidateId = null;
try {
  candidateId = $('Set: File Metadata').first().json.candidateId || null;
} catch (e) {
  candidateId = cv.personal_information?.email || 'unknown';
}

// Skills chunk
const skillsChunk = {
  candidate_id: candidateId,
  chunk_type: 'skills',
  content: Array.isArray(cv.skills) && cv.skills.length > 0
    ? 'Skills: ' + cv.skills.join(', ')
    : 'Skills: Not specified'
};

// Education chunk
const educationLines = (cv.education || []).map(e =>
  [e.degree, e.institution, e.location, e.start_date?.slice(0,4), e.end_date?.slice(0,4)]
  .filter(Boolean).join(' | ')
);
const educationChunk = {
  candidate_id: candidateId,
  chunk_type: 'education',
  content: educationLines.length > 0
    ? 'Education:\n' + educationLines.join('\n')
    : 'Education: Not specified'
};

// Experience chunk
const experienceLines = (cv.experience || []).map(exp => {
  const dates = [exp.start_date?.slice(0,7), exp.end_date?.slice(0,7)].filter(Boolean).join(' to ');
  const highlights = Array.isArray(exp.highlights) && exp.highlights.length > 0
    ? exp.highlights.join('. ')
    : exp.description || '';
  return `${exp.job_title} at ${exp.company} (${exp.location}) [${dates}]: ${highlights}`;
});
const experienceChunk = {
  candidate_id: candidateId,
  chunk_type: 'experience',
  content: experienceLines.length > 0
    ? 'Experience:\n' + experienceLines.join('\n')
    : 'Experience: Not specified'
};

// Additional information chunk
const additionalParts = [];
if (cv.certifications?.length > 0) {
  additionalParts.push('Certifications: ' + cv.certifications.join(', '));
}
if (cv.languages?.length > 0) {
  additionalParts.push('Languages: ' + cv.languages.map(l => l.language + ' (' + l.proficiency + ')').join(', '));
}
if (cv.cv_summary) {
  additionalParts.push('Profile Summary: ' + cv.cv_summary);
}
const additionalChunk = {
  candidate_id: candidateId,
  chunk_type: 'additional_information',
  content: additionalParts.length > 0 ? additionalParts.join('\n') : 'Additional information: Not specified'
};

return [
  { json: skillsChunk },
  { json: educationChunk },
  { json: experienceChunk },
  { json: additionalChunk }
];'''
A_EXTRACT = node("Fn: Extract Structured CV", "n8n-nodes-base.code", 2, [1700, 0], {"jsCode": A_EXTRACT_CODE})

A_VALIDATE_CODE = r'''const { candidate_id, chunk_type, content } = $json;

if (!chunk_type) throw new Error('chunk_type is missing');
if (!content || content.trim().length < 5) {
  throw new Error(`Chunk '${chunk_type}' has empty or trivial content`);
}

const MAX_CHARS = 8000;
const truncated = content.length > MAX_CHARS
  ? content.slice(0, MAX_CHARS) + '... [truncated]'
  : content;

return {
  json: {
    candidate_id,
    chunk_type,
    content: truncated,
    char_count: truncated.length,
    validated_at: new Date().toISOString()
  }
};'''
A_VALIDATE = node("Fn: Validate Chunks", "n8n-nodes-base.code", 2, [1920, 0],
                  {"mode": "runOnceForEachItem", "jsCode": A_VALIDATE_CODE})

A_EMBED = node("HTTP: Embed Chunk", "n8n-nodes-base.httpRequest", 4.4, [2140, 0], {
    "method": "POST", "url": "https://openrouter.ai/api/v1/embeddings",
    "authentication": "genericCredentialType", "genericAuthType": "httpBearerAuth",
    "sendHeaders": True,
    "headerParameters": {"parameters": [{"name": "Content-Type", "value": "application/json"}]},
    "sendBody": True, "specifyBody": "json",
    "jsonBody": '={\n  "model": "mistralai/mistral-embed-2312",\n  "input":  {{ $json.content.toJsonString() }}\n}',
    "options": {},
}, credentials=BEARER_CRED)

A_ATTACH_CODE = r'''// Pull the embedding from the HTTP response
const embedding = $json.data?.[0]?.embedding;
if (!embedding || !Array.isArray(embedding) || embedding.length === 0) { throw new Error(`No embedding returned for chunk. Response: ${JSON.stringify($json).slice(0, 200)}`); }
const prev = $('Fn: Validate Chunks').item.json;
function sha1Bytes(bytes) { function rol(n,s){return (n<<s)|(n>>>(32-s));} let h0=0x67452301,h1=0xEFCDAB89,h2=0x98BADCFE,h3=0x10325476,h4=0xC3D2E1F0; const ml=bytes.length*8; const withOne=bytes.concat([0x80]); while(withOne.length%64!==56){withOne.push(0);} for(let i=7;i>=0;i--){withOne.push((ml/Math.pow(2,i*8))&0xff);} for(let i=0;i<withOne.length;i+=64){ const w=new Array(80); for(let j=0;j<16;j++){w[j]=(withOne[i+j*4]<<24)|(withOne[i+j*4+1]<<16)|(withOne[i+j*4+2]<<8)|(withOne[i+j*4+3]);} for(let j=16;j<80;j++){w[j]=rol(w[j-3]^w[j-8]^w[j-14]^w[j-16],1);} let a=h0,b=h1,c=h2,d=h3,e=h4; for(let j=0;j<80;j++){ let f,k; if(j<20){f=(b&c)|((~b)&d);k=0x5A827999;} else if(j<40){f=b^c^d;k=0x6ED9EBA1;} else if(j<60){f=(b&c)|(b&d)|(c&d);k=0x8F1BBCDC;} else {f=b^c^d;k=0xCA62C1D6;} const t=(rol(a,5)+f+e+k+w[j])|0; e=d;d=c;c=rol(b,30);b=a;a=t; } h0=(h0+a)|0;h1=(h1+b)|0;h2=(h2+c)|0;h3=(h3+d)|0;h4=(h4+e)|0; } const out=[]; [h0,h1,h2,h3,h4].forEach(function(hh){out.push((hh>>>24)&0xff,(hh>>>16)&0xff,(hh>>>8)&0xff,hh&0xff);}); return out; }
function uuidv5(name) { const ns=[0x6b,0xa7,0xb8,0x10,0x9d,0xad,0x11,0xd1,0x80,0xb4,0x00,0xc0,0x4f,0xd4,0x30,0xc8]; const nameBytes=[]; for(let i=0;i<name.length;i++){nameBytes.push(name.charCodeAt(i)&0xff);} const hash=sha1Bytes(ns.concat(nameBytes)).slice(0,16); hash[6]=(hash[6]&0x0f)|0x50; hash[8]=(hash[8]&0x3f)|0x80; const hex=hash.map(function(x){return ('0'+x.toString(16)).slice(-2);}).join(''); return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`; }
const chunkKey = String(prev.candidate_id).replace(/[^a-zA-Z0-9]/g, '_') + '_' + prev.chunk_type;
const pointId = uuidv5(chunkKey);
return { json: { point_id: pointId, candidate_id: prev.candidate_id, chunk_type: prev.chunk_type, content: prev.content, embedding: embedding, model: $json.model || 'mistralai/mistral-embed-2312', dimensions: embedding.length, char_count: prev.char_count, embedded_at: new Date().toISOString() } };'''
A_ATTACH = node("Fn: Attach Embedding to Chunk", "n8n-nodes-base.code", 2, [2360, 0],
                {"mode": "runOnceForEachItem", "jsCode": A_ATTACH_CODE})

A_QDRANT = node("Qdrant: Upsert CV Point", "n8n-nodes-base.httpRequest", 4.4, [2580, -160], {
    "method": "PUT", "url": f"={QDRANT}/collections/talento_cv_embeddings/points",
    "sendHeaders": True, "headerParameters": {"parameters": []},
    "sendBody": True, "specifyBody": "json",
    "jsonBody": "={{  JSON.stringify({ points: [ { id: $json.point_id, vector: $json.embedding, payload: { candidate_id: $json.candidate_id, chunk_type: $json.chunk_type, content: $json.content } } ] })  }}",
    "options": {},
})

A_STORE_CHUNK = node("Laravel: Store CV Chunk", "n8n-nodes-base.httpRequest", 4.4, [2580, 0], {
    "method": "POST", "url": f"={BASE}/api/v1/resumes/chunks",
    "sendHeaders": True, "headerParameters": laravel_headers()["parameters"],
    "sendBody": True, "specifyBody": "json",
    "jsonBody": "={{  JSON.stringify({ candidate_id: $json.candidate_id, chunk_type: $json.chunk_type, content: $json.content, char_count: $json.char_count, validated_at: $json.embedded_at })  }}",
    "options": {},
})

A_STORE_EMB = node("Laravel: Store CV Embedding", "n8n-nodes-base.httpRequest", 4.4, [2580, 160], {
    "method": "POST", "url": f"={BASE}/api/v1/resumes/embeddings",
    "sendHeaders": True, "headerParameters": laravel_headers()["parameters"],
    "sendBody": True, "specifyBody": "json",
    "jsonBody": "={{  JSON.stringify({ candidate_id: $json.candidate_id, chunk_type: $json.chunk_type, model: $json.model, dimensions: $json.dimensions, char_count: $json.char_count, embedded_at: $json.embedded_at, qdrant_collection: 'talento_cv_embeddings', qdrant_point_id: $json.point_id })  }}",
    "options": {},
})

# FIX #5: after all chunks are upserted to Qdrant, kick off CV->Job matching once.
A_COLLECT_CODE = r'''// Runs once after every CV chunk has been upserted to Qdrant.
// Emits a single item that drives the shared CV -> Job matching lane.
const candidateId = $('Set: File Metadata').first().json.candidateId;
if (!candidateId) throw new Error('candidate_id missing for CV->Job matching');

return [{
  json: {
    candidate_id: candidateId,
    trigger: 'cv_upload',
    callback: {
      match_done: 'http://host.docker.internal:8000/api/n8n/match/done',
      log_error:  'http://host.docker.internal:8000/api/n8n/log-error'
    }
  }
}];'''
A_COLLECT = node("Fn: Collect Candidate", "n8n-nodes-base.code", 2, [2800, -160], {"jsCode": A_COLLECT_CODE})

link(A_TRIGGER, A_META)
link(A_META, A_DL)
link(A_DL, A_OCR)
link(A_OCR, A_CLASSIFY)
link(A_CLASSIFY, A_EXTRACT)
link(A_GEMINI, A_CLASSIFY, "ai_languageModel", "ai_languageModel")
link(A_AUTOFIX, A_CLASSIFY, "ai_outputParser", "ai_outputParser")
link(A_MISTRAL_CHAT, A_AUTOFIX, "ai_languageModel", "ai_languageModel")
link(A_STRUCT, A_AUTOFIX, "ai_outputParser", "ai_outputParser")
link(A_EXTRACT, A_VALIDATE)
link(A_VALIDATE, A_EMBED)
link(A_EMBED, A_ATTACH)
link(A_ATTACH, A_QDRANT)
link(A_ATTACH, A_STORE_CHUNK)
link(A_ATTACH, A_STORE_EMB)
link(A_QDRANT, A_COLLECT)

# ===========================================================================
# LANE C — CV -> JOB MATCHING (shared)
# ===========================================================================
C_WEBHOOK = node("Webhook: CV Match", "n8n-nodes-base.webhook", 2, [320, 760], {
    "httpMethod": "POST", "path": "cv-match", "responseMode": "responseNode", "options": {},
}, extra={"webhookId": "0425422e-0b6f-491a-ab32-dba52d02b1ac"})

C_RESPOND = node("Respond: CV Match 200", "n8n-nodes-base.respondToWebhook", 1.1, [540, 900], {
    "respondWith": "json", "responseBody": '={ "received": true }', "options": {}})

C_VALIDATE_CODE = r'''const body = $input.first().json.body ?? $input.first().json;
if (!body.candidate_id) throw new Error('Missing candidate_id in webhook payload');

return [{
  json: {
    candidate_id: body.candidate_id,
    trigger:      body.trigger ?? 'cv_upload',
    callback:     body.callback ?? {
      match_done:  'http://host.docker.internal:8000/api/n8n/match/done',
      log_error:   'http://host.docker.internal:8000/api/n8n/log-error',
    },
  }
}];'''
C_VALIDATE = node("Fn: Validate CV Payload", "n8n-nodes-base.code", 2, [540, 760], {"jsCode": C_VALIDATE_CODE})

# Shared context node: both the CV lane (Collect) and the webhook (Validate) feed it,
# so downstream nodes can reference one stable node name for {candidate_id, trigger, callback}.
C_CTX_CODE = r'''return { json: $json };'''
C_CTX = node("Fn: Match Context", "n8n-nodes-base.code", 2, [760, 760],
             {"mode": "runOnceForEachItem", "jsCode": C_CTX_CODE})

C_FETCH = node("Qdrant: Fetch Candidate Chunks", "n8n-nodes-base.httpRequest", 4.4, [980, 760], {
    "method": "POST", "url": f"={QDRANT}/collections/talento_cv_embeddings/points/scroll",
    "sendHeaders": True, "headerParameters": {"parameters": [{"name": "Content-Type", "value": "application/json"}]},
    "sendBody": True, "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({ filter: { must: [{ key: 'candidate_id', match: { value: $json.candidate_id } }] }, limit: 10, with_vectors: true, with_payload: true }) }}",
    "options": {},
})

C_AVG_CODE = r'''const WEIGHTS = {
  skills:                 0.40,
  experience:             0.35,
  education:              0.15,
  additional_information: 0.10,
};

const scrollResult = $input.first().json;
const points = scrollResult.result?.points ?? [];

if (points.length === 0) {
  throw new Error(`No embeddings found in Qdrant for candidate_id: ${$('Fn: Match Context').first().json.candidate_id}`);
}

const dims = points[0].vector?.length;
if (!dims) throw new Error('Vector missing from Qdrant scroll result — ensure with_vectors: true');

const avgVector = new Array(dims).fill(0);
let totalWeight = 0;

for (const point of points) {
  const chunkType = point.payload?.chunk_type;
  const vector    = point.vector;
  if (!vector || !chunkType) continue;

  const weight = WEIGHTS[chunkType] ?? 0.10;
  for (let i = 0; i < dims; i++) {
    avgVector[i] += vector[i] * weight;
  }
  totalWeight += weight;
}

if (totalWeight === 0) throw new Error('No valid chunks to average');

const normVector = avgVector.map(v => v / totalWeight);
const meta = $('Fn: Match Context').first().json;

return [{
  json: {
    candidate_id:   meta.candidate_id,
    trigger:        meta.trigger,
    callback:       meta.callback,
    avg_vector:     normVector,
    chunk_count:    points.length,
  }
}];'''
C_AVG = node("Fn: Average CV Vectors", "n8n-nodes-base.code", 2, [1200, 760], {"jsCode": C_AVG_CODE})

C_SEARCH = node("Qdrant: Search Job Embeddings", "n8n-nodes-base.httpRequest", 4.4, [1420, 760], {
    "method": "POST", "url": f"={QDRANT}/collections/talento_job_embeddings/points/search",
    "sendHeaders": True, "headerParameters": {"parameters": [{"name": "Content-Type", "value": "application/json"}]},
    "sendBody": True, "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({ vector: $json.avg_vector, limit: 50, with_payload: true, score_threshold: 0.55 }) }}",
    "options": {},
})

C_BATCH_CODE = r'''const results = $input.first().json.result ?? [];
const meta    = $('Fn: Match Context').first().json;

if (results.length === 0) {
  return [{ json: {
    batches: [{
      job_post_id: null,
      trigger:     meta.trigger,
      callback:    meta.callback,
      matches:     [],
      empty:       true,
    }]
  }}];
}

const batches = results.map(point => ({
  job_post_id: point.payload?.job_post_id,
  trigger:     meta.trigger,
  callback:    meta.callback,
  matches: [{
    candidate_id:    meta.candidate_id,
    match_score:     parseFloat((point.score ?? 0).toFixed(4)),
    score_breakdown: { overall: parseFloat((point.score ?? 0).toFixed(4)) },
  }],
})).filter(b => b.job_post_id != null);

return [{ json: { batches } }];'''
C_BATCH = node("Fn: Build Job Match Batches", "n8n-nodes-base.code", 2, [1640, 760], {"jsCode": C_BATCH_CODE})

C_SPLIT_CODE = r'''const { batches } = $input.first().json;
if (!batches || batches.length === 0) return [];
return batches.map(b => ({ json: b }));'''
C_SPLIT = node("Fn: Split Into Items", "n8n-nodes-base.code", 2, [1860, 760], {"jsCode": C_SPLIT_CODE})

C_SKIP_CODE = r'''// Drop the empty-sentinel batch; pass real job-match batches through.
return $input.all().filter(item => item.json.empty !== true);'''
C_SKIP = node("Fn: Skip If Empty", "n8n-nodes-base.code", 2, [2080, 760],
              {"jsCode": C_SKIP_CODE})

# FIX #3: secret header added.
C_STORE = node("Laravel: Store Match Per Job", "n8n-nodes-base.httpRequest", 4.4, [2300, 760], {
    "method": "POST", "url": "={{ $json.callback.match_done }}",
    "sendHeaders": True, "headerParameters": laravel_headers(secret=True)["parameters"],
    "sendBody": True, "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({ job_post_id: $json.job_post_id, trigger: $json.trigger, matches: $json.matches }) }}",
    "options": {},
})

C_AUTH = secret_gate("Auth: CV Match Secret", [430, 760], "cv-secret")
C_RESPOND_401 = respond_401("Respond: CV Match 401", [650, 980])

link(C_WEBHOOK, C_AUTH)
link(C_AUTH, C_RESPOND, index=0)
link(C_AUTH, C_VALIDATE, index=0)
link(C_AUTH, C_RESPOND_401, index=1)
link(C_VALIDATE, C_CTX)
link(A_COLLECT, C_CTX)
link(C_CTX, C_FETCH)
link(C_FETCH, C_AVG)
link(C_AVG, C_SEARCH)
link(C_SEARCH, C_BATCH)
link(C_BATCH, C_SPLIT)
link(C_SPLIT, C_SKIP)
link(C_SKIP, C_STORE)

# ===========================================================================
# LANE B — JOB PUBLISHED -> EMBED + MATCH
# ===========================================================================
B_WEBHOOK = node("Webhook: Job Published", "n8n-nodes-base.webhook", 2, [320, 1160], {
    "httpMethod": "POST", "path": "job-embed", "responseMode": "responseNode", "options": {},
}, extra={"webhookId": "bdd5582b-5cf3-465a-be1d-43501db145c7"})

B_RESPOND = node("Respond: Job 200", "n8n-nodes-base.respondToWebhook", 1.1, [540, 1300], {
    "respondWith": "json", "responseBody": '={ "received": true }', "options": {}})

# FIX #2: prefer Laravel's prebuilt text_to_embed; fall back to raw fields.
B_BUILD_CODE = r'''const body = $input.first().json.body ?? $input.first().json;

if (!body.job_post_id) throw new Error('Missing job_post_id in webhook payload');
if (!body.title)       throw new Error('Missing title in webhook payload');

// Laravel's listener already builds the embeddable text (JobPost::embeddableText()).
// Use it directly; only rebuild from raw fields if it is absent.
const parts = [body.title, body.description, body.requirements, body.responsibilities].filter(Boolean);
let textToEmbed = body.text_to_embed && String(body.text_to_embed).trim().length > 0
  ? String(body.text_to_embed)
  : parts.join('\n\n');

if (!textToEmbed || textToEmbed.trim().length === 0) {
  throw new Error('No embeddable text found in job post payload');
}

const MAX_CHARS = 8000;
if (textToEmbed.length > MAX_CHARS) {
  textToEmbed = textToEmbed.slice(0, MAX_CHARS) + '... [truncated]';
}

function sha1Bytes(bytes) { function rol(n,s){return (n<<s)|(n>>>(32-s));} let h0=0x67452301,h1=0xEFCDAB89,h2=0x98BADCFE,h3=0x10325476,h4=0xC3D2E1F0; const ml=bytes.length*8; const withOne=bytes.concat([0x80]); while(withOne.length%64!==56){withOne.push(0);} for(let i=7;i>=0;i--){withOne.push((ml/Math.pow(2,i*8))&0xff);} for(let i=0;i<withOne.length;i+=64){ const w=new Array(80); for(let j=0;j<16;j++){w[j]=(withOne[i+j*4]<<24)|(withOne[i+j*4+1]<<16)|(withOne[i+j*4+2]<<8)|(withOne[i+j*4+3]);} for(let j=16;j<80;j++){w[j]=rol(w[j-3]^w[j-8]^w[j-14]^w[j-16],1);} let a=h0,b=h1,c=h2,d=h3,e=h4; for(let j=0;j<80;j++){ let f,k; if(j<20){f=(b&c)|((~b)&d);k=0x5A827999;} else if(j<40){f=b^c^d;k=0x6ED9EBA1;} else if(j<60){f=(b&c)|(b&d)|(c&d);k=0x8F1BBCDC;} else {f=b^c^d;k=0xCA62C1D6;} const t=(rol(a,5)+f+e+k+w[j])|0; e=d;d=c;c=rol(b,30);b=a;a=t; } h0=(h0+a)|0;h1=(h1+b)|0;h2=(h2+c)|0;h3=(h3+d)|0;h4=(h4+e)|0; } const out=[]; [h0,h1,h2,h3,h4].forEach(function(hh){out.push((hh>>>24)&0xff,(hh>>>16)&0xff,(hh>>>8)&0xff,hh&0xff);}); return out; }
function uuidv5(name) { const ns=[0x6b,0xa7,0xb8,0x10,0x9d,0xad,0x11,0xd1,0x80,0xb4,0x00,0xc0,0x4f,0xd4,0x30,0xc8]; const nameBytes=[]; for(let i=0;i<name.length;i++){nameBytes.push(name.charCodeAt(i)&0xff);} const hash=sha1Bytes(ns.concat(nameBytes)).slice(0,16); hash[6]=(hash[6]&0x0f)|0x50; hash[8]=(hash[8]&0x3f)|0x80; const hex=hash.map(function(x){return ('0'+x.toString(16)).slice(-2);}).join(''); return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`; }

const pointId = uuidv5('job_post_' + String(body.job_post_id));

return [{
  json: {
    job_post_id:    body.job_post_id,
    company_id:     body.company_id ?? null,
    title:          body.title,
    text_to_embed:  textToEmbed,
    char_count:     textToEmbed.length,
    trigger:        body.trigger ?? 'job_publish',
    point_id:       pointId,
    callback:       body.callback ?? {
      embedding_done: 'http://host.docker.internal:8000/api/n8n/job-embedding/done',
      match_done:     'http://host.docker.internal:8000/api/n8n/match/done',
      log_error:      'http://host.docker.internal:8000/api/n8n/log-error',
    },
  }
}];'''
B_BUILD = node("Fn: Build & Validate Job Text", "n8n-nodes-base.code", 2, [540, 1160], {"jsCode": B_BUILD_CODE})

B_EMBED = node("OpenRouter: Embed Job Text", "n8n-nodes-base.httpRequest", 4.4, [760, 1160], {
    "method": "POST", "url": "https://openrouter.ai/api/v1/embeddings",
    "authentication": "genericCredentialType", "genericAuthType": "httpBearerAuth",
    "sendHeaders": True,
    "headerParameters": {"parameters": [{"name": "Content-Type", "value": "application/json"}]},
    "sendBody": True, "specifyBody": "json",
    "jsonBody": '={\n  "model": "mistralai/mistral-embed-2312",\n  "input":  {{ $json.text_to_embed.toJsonString() }}\n}',
    "options": {},
}, credentials=BEARER_CRED)

B_ATTACH_CODE = r'''const embedding = $input.first().json.data?.[0]?.embedding;
if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
  throw new Error(`No embedding returned. Response: ${JSON.stringify($input.first().json).slice(0, 200)}`);
}

const prev = $('Fn: Build & Validate Job Text').first().json;

return [{
  json: {
    ...prev,
    embedding,
    model:      'mistralai/mistral-embed-2312',
    dimensions: embedding.length,
    embedded_at: new Date().toISOString(),
  }
}];'''
B_ATTACH = node("Fn: Attach Embedding to Job", "n8n-nodes-base.code", 2, [980, 1160], {"jsCode": B_ATTACH_CODE})

B_QDRANT = node("Qdrant: Upsert Job Point", "n8n-nodes-base.httpRequest", 4.4, [1200, 1160], {
    "method": "PUT", "url": f"={QDRANT}/collections/talento_job_embeddings/points",
    "sendHeaders": True, "headerParameters": {"parameters": []},
    "sendBody": True, "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({ points: [ { id: $json.point_id, vector: $json.embedding, payload: { job_post_id: $json.job_post_id, company_id: $json.company_id, title: $json.title, model: $json.model, dimensions: $json.dimensions } } ] }) }}",
    "options": {},
})

B_CONFIRM = node("Laravel: Confirm Embedding", "n8n-nodes-base.httpRequest", 4.4, [1420, 1160], {
    "method": "POST", "url": "={{ $('Fn: Build & Validate Job Text').first().json.callback.embedding_done }}",
    "sendHeaders": True, "headerParameters": laravel_headers(secret=True)["parameters"],
    "sendBody": True, "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({ job_post_id: $('Fn: Attach Embedding to Job').first().json.job_post_id, qdrant_point_id: $('Fn: Attach Embedding to Job').first().json.point_id, model: $('Fn: Attach Embedding to Job').first().json.model, dimensions: $('Fn: Attach Embedding to Job').first().json.dimensions, char_count: $('Fn: Attach Embedding to Job').first().json.char_count }) }}",
    "options": {},
})

B_SEARCH = node("Qdrant: Search CV Embeddings", "n8n-nodes-base.httpRequest", 4.4, [1640, 1160], {
    "method": "POST", "url": f"={QDRANT}/collections/talento_cv_embeddings/points/search",
    "sendHeaders": True, "headerParameters": {"parameters": [{"name": "Content-Type", "value": "application/json"}]},
    "sendBody": True, "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({ vector: $('Fn: Attach Embedding to Job').first().json.embedding, limit: 50, with_payload: true, score_threshold: 0.55 }) }}",
    "options": {},
})

B_AGG_CODE = r'''const WEIGHTS = {
  skills:                 0.40,
  experience:             0.35,
  education:              0.15,
  additional_information: 0.10,
};

const results = $input.first().json.result ?? [];

if (results.length === 0) {
  const meta = $('Fn: Build & Validate Job Text').first().json;
  return [{ json: { job_post_id: meta.job_post_id, trigger: meta.trigger, callback: meta.callback, matches: [] } }];
}

const byCandidate = {};

for (const point of results) {
  const candidateId = point.payload?.candidate_id;
  const chunkType   = point.payload?.chunk_type;
  const score       = point.score ?? 0;

  if (!candidateId || !chunkType) continue;

  if (!byCandidate[candidateId]) {
    byCandidate[candidateId] = { breakdown: {}, weightedSum: 0, totalWeight: 0 };
  }

  const weight = WEIGHTS[chunkType] ?? 0.10;

  if (!byCandidate[candidateId].breakdown[chunkType] ||
       score > byCandidate[candidateId].breakdown[chunkType]) {
    if (byCandidate[candidateId].breakdown[chunkType]) {
      byCandidate[candidateId].weightedSum -= byCandidate[candidateId].breakdown[chunkType] * weight;
      byCandidate[candidateId].totalWeight -= weight;
    }
    byCandidate[candidateId].breakdown[chunkType] = score;
    byCandidate[candidateId].weightedSum  += score * weight;
    byCandidate[candidateId].totalWeight  += weight;
  }
}

const matches = Object.entries(byCandidate).map(([candidateId, data]) => ({
  candidate_id:    candidateId,
  match_score:     data.totalWeight > 0
                     ? parseFloat((data.weightedSum / data.totalWeight).toFixed(4))
                     : 0,
  score_breakdown: data.breakdown,
}));

matches.sort((a, b) => b.match_score - a.match_score);
const top = matches.slice(0, 100);

const meta = $('Fn: Build & Validate Job Text').first().json;

return [{
  json: {
    job_post_id: meta.job_post_id,
    trigger:     meta.trigger,
    callback:    meta.callback,
    matches:     top,
  }
}];'''
B_AGG = node("Fn: Aggregate Candidate Scores", "n8n-nodes-base.code", 2, [1860, 1160], {"jsCode": B_AGG_CODE})

B_STORE = node("Laravel: Store Match Results", "n8n-nodes-base.httpRequest", 4.4, [2080, 1160], {
    "method": "POST", "url": "={{ $json.callback.match_done }}",
    "sendHeaders": True, "headerParameters": laravel_headers(secret=True)["parameters"],
    "sendBody": True, "specifyBody": "json",
    "jsonBody": "={{ JSON.stringify({ job_post_id: $json.job_post_id, trigger: $json.trigger, matches: $json.matches }) }}",
    "options": {},
})

B_AUTH = secret_gate("Auth: Job Embed Secret", [430, 1160], "job-secret")
B_RESPOND_401 = respond_401("Respond: Job 401", [650, 1380])

link(B_WEBHOOK, B_AUTH)
link(B_AUTH, B_RESPOND, index=0)
link(B_AUTH, B_BUILD, index=0)
link(B_AUTH, B_RESPOND_401, index=1)
link(B_BUILD, B_EMBED)
link(B_EMBED, B_ATTACH)
link(B_ATTACH, B_QDRANT)
link(B_QDRANT, B_CONFIRM)
link(B_CONFIRM, B_SEARCH)
link(B_SEARCH, B_AGG)
link(B_AGG, B_STORE)

# ===========================================================================
# LANE E — UNIFIED ERROR HANDLING
# ===========================================================================
E_TRIGGER = node("Error Trigger", "n8n-nodes-base.errorTrigger", 1, [320, 1500], {})

E_LOG = node("Log Error to Laravel", "n8n-nodes-base.httpRequest", 4.4, [540, 1500], {
    "method": "POST", "url": f"={BASE}/api/n8n/log-error",
    "sendHeaders": True, "headerParameters": laravel_headers(secret=True)["parameters"],
    "sendBody": True, "specifyBody": "json",
    "jsonBody": '={\n  "workflow":  "TALENTO Unified Pipeline",\n  "node":      "{{ $json.execution.error.node.name }}",\n  "error":     "{{ $json.execution.error.message }}",\n  "failed_at": "{{ new Date().toISOString() }}"\n}',
    "options": {},
})

link(E_TRIGGER, E_LOG)

# ===========================================================================
# ASSEMBLE
# ===========================================================================
workflow = {
    "name": "TALENTO — Unified CV & Job Matching Pipeline",
    "nodes": nodes,
    "connections": conns,
    "active": False,
    "settings": {"executionOrder": "v1", "binaryMode": "separate"},
    "pinData": {},
    "meta": {"instanceId": "27fbcdd2cc59f598442309c29147333a5c0a8b71d6d6ca1bd797ec0316903451"},
    "tags": [],
}

out = "docs/n8n/TALENTO-Unified-Pipeline.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(workflow, f, indent=2, ensure_ascii=False)

print(f"Wrote {out}")
print(f"nodes={len(nodes)} connection_sources={len(conns)}")
