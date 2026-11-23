'use strict';
const el = (id) => document.getElementById(id);
const BASE_PATH =
  window.location.pathname === '/web' || window.location.pathname.startsWith('/web/')
    ? '/web'
    : '';
const mcpUrl = `${BASE_PATH}/mcp-v2`;
if (BASE_PATH && el('op-home-link')) {
  el('op-home-link').setAttribute('href', BASE_PATH);
}

let token = '';
let binding = null;
let reviewDocument = null;
let busy = false;
let rpcSeq = 1;

function status(message, error = false) {
  el('status').textContent = message;
  el('status').dataset.error = String(error);
}

function reset() {
  token = '';
  binding = null;
  reviewDocument = null;
  if (el('bearer-token')) el('bearer-token').value = '';
  el('upload-button').disabled = true;
  el('evidence-button').disabled = true;
  el('result').textContent = '';
  el('review').textContent = '';
  el('binding').textContent = '';
  el('logout').hidden = true;
}

function credentials() {
  if (!token) {
    throw Error('Vui lòng kích hoạt phiên OAuth 2.1 Bearer trước khi gửi yêu cầu.');
  }
  return {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'mcp-protocol-version': '2025-11-25',
  };
}

async function callMcpTool(toolName, toolArgs) {
  const response = await fetch(mcpUrl, {
    method: 'POST',
    headers: credentials(),
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: rpcSeq++,
      method: 'tools/call',
      params: { name: toolName, arguments: toolArgs },
    }),
  });
  if (!response.ok) {
    throw Error('Yêu cầu MCP bị từ chối với mã HTTP ' + response.status);
  }
  const raw = await response.text();
  const dataLine =
    raw.startsWith('data:') || raw.startsWith('event:')
      ? raw
          .split('\n')
          .find((line) => line.startsWith('data:'))
          ?.slice(5) || '{}'
      : raw;
  const packet = JSON.parse(dataLine);
  const structured = packet.result?.structuredContent;
  if (packet.error || packet.result?.isError || !structured || structured.status === 'failed') {
    throw Error(
      structured?.errors?.[0]?.code ||
        packet.error?.message ||
        'Yêu cầu chưa được hệ thống chấp nhận.'
    );
  }
  return structured;
}

function activateToken() {
  const candidate = (el('bearer-token')?.value || '').trim();
  if (candidate.length < 24 || /\s/.test(candidate)) {
    throw Error('Mã truy cập OAuth 2.1 Bearer không hợp lệ.');
  }
  token = candidate;
  el('logout').hidden = false;
  status('Đã kích hoạt phiên làm việc trong bộ nhớ tạm. Kiểm tra mission trước khi đăng ký file.');
}

async function getWork() {
  const mission = el('mission').value.trim();
  if (!/^NM-[a-f0-9]{12}$/.test(mission)) throw Error('Mã mission không hợp lệ.');
  binding = null;
  el('upload-button').disabled = true;
  el('evidence-button').disabled = true;
  const responseBody = await callMcpTool('glow_get_factory_work', { mission_id: mission });
  const work = responseBody.result?.payload;
  const plan = work?.preproduction_capability_plan;
  if (!work || !plan || !plan.phase_work_id) {
    throw Error('Dự án chưa mở gói tiếp nhận tài liệu hoặc bạn không có quyền.');
  }
  binding = {
    mission_id: mission,
    expected_state_version: work.state_version,
    phase_work_id: plan.phase_work_id,
    work_contract_revision: plan.work_contract_revision,
  };
  el('binding').textContent =
    'Dự án đã xác minh · phiên bản ' + work.state_version + ' · đúng tài khoản sở hữu mission';
  el('upload-button').disabled = false;
  el('evidence-button').disabled = false;
}

async function admit(toolName, args) {
  if (!binding || el('mission').value.trim() !== binding.mission_id) {
    throw Error('Hãy kiểm tra lại mission.');
  }
  if (busy) throw Error('Đang xử lý yêu cầu trước.');
  busy = true;
  try {
    const out = await callMcpTool(toolName, { ...args, ...binding });
    const payload = out.result?.payload;
    el('result').textContent = JSON.stringify(payload, null, 2);
    return payload;
  } finally {
    busy = false;
  }
}

function run(task) {
  Promise.resolve()
    .then(task)
    .catch((error) => status(error.message, true));
}

el('login').addEventListener('click', () => run(activateToken));
el('logout').addEventListener('click', () => {
  reset();
  status('Đã xóa phiên làm việc trên trang này.');
});
el('work').addEventListener('click', () => run(getWork));
el('mission').addEventListener('input', () => {
  binding = null;
  el('upload-button').disabled = true;
  el('evidence-button').disabled = true;
  el('binding').textContent = '';
});
el('upload').addEventListener('submit', (event) => {
  event.preventDefault();
  run(async () => {
    const file = el('artifact').files[0];
    if (!file || file.size === 0 || file.size > 8 * 1024 * 1024) {
      throw Error('Chọn file thật, không rỗng, tối đa 8 MiB.');
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 32768) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    }
    const expected = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('');
    const result = await admit('glow_register_factory_artifact', { data_base64: btoa(binary) });
    if (result?.artifact_sha256 !== expected) {
      throw Error('Hash file trả về không khớp. Dừng đăng ký evidence.');
    }
    status('Đã đăng ký đúng bytes của file. Đây là xác nhận identity, chưa phải phê duyệt chất lượng.');
  });
});
el('evidence-file').addEventListener('change', () => {
  reviewDocument = null;
  el('reviewed').checked = false;
  run(async () => {
    const file = el('evidence-file').files[0];
    if (!file || file.size > 512 * 1024) throw Error('Chọn hồ sơ JSON tối đa 512 KiB.');
    const documentObj = JSON.parse(await file.text());
    const allowed = ['kind', 'artifact_sha256', 'evidence_sha256', 'bindings', 'reviewed_result'];
    if (
      !documentObj ||
      typeof documentObj !== 'object' ||
      Array.isArray(documentObj) ||
      Object.keys(documentObj).some((key) => !allowed.includes(key))
    ) {
      throw Error('Hồ sơ có trường ngoài contract.');
    }
    reviewDocument = documentObj;
    el('review').textContent = JSON.stringify(documentObj, null, 2);
  });
});
el('evidence').addEventListener('submit', (event) => {
  event.preventDefault();
  run(async () => {
    if (!reviewDocument || !el('reviewed').checked) {
      throw Error('Đọc hồ sơ và xác nhận đã xem bằng chứng.');
    }
    await admit('glow_register_factory_evidence', reviewDocument);
    status(
      'Đã nhận mã chứng thực từ backend. Chủ dự án vẫn cần xem xét và xác nhận kết quả theo đúng quyền.'
    );
  });
});
