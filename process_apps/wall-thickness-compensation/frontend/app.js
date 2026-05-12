const samplePoints = [
  { id: 'K1_J1_I1', x: 0, y: 56, z: 60, stiffness: 1200, error: 0.08 },
  { id: 'K1_J2_I1', x: 0, y: 36, z: 60, stiffness: 980, error: 0.11 },
  { id: 'K1_J3_I1', x: 0, y: 16, z: 60, stiffness: 860, error: 0.13 },
]

const elements = {
  apiBase: document.querySelector('#apiBase'),
  form: document.querySelector('#compensationForm'),
  loadSample: document.querySelector('#loadSample'),
  method: document.querySelector('#method'),
  pointsInput: document.querySelector('#pointsInput'),
  radialDepth: document.querySelector('#radialDepth'),
  resultOutput: document.querySelector('#resultOutput'),
}

bootstrap()

function bootstrap() {
  elements.apiBase.value = defaultApiBase()
  elements.pointsInput.value = JSON.stringify(samplePoints, null, 2)
  elements.loadSample.addEventListener('click', () => {
    elements.pointsInput.value = JSON.stringify(samplePoints, null, 2)
  })
  elements.form.addEventListener('submit', (event) => {
    event.preventDefault()
    void runCompensation()
  })
}

function defaultApiBase() {
  if (window.location.port === '18090') return '/api/wall-thickness-compensation'
  return 'http://127.0.0.1:8010'
}

async function runCompensation() {
  try {
    const payload = {
      method: elements.method.value,
      radial_depth: Number(elements.radialDepth.value),
      model_version: 'v1.0',
      points: JSON.parse(elements.pointsInput.value),
    }
    const response = await fetch(`${normalizeBase(elements.apiBase.value)}/compensation/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await response.json().catch(() => null)
    if (!response.ok) throw new Error(JSON.stringify(body ?? { status: response.status }, null, 2))
    elements.resultOutput.textContent = JSON.stringify(body, null, 2)
  } catch (error) {
    elements.resultOutput.textContent = error instanceof Error ? error.message : 'Compensation failed'
  }
}

function normalizeBase(value) {
  return value.trim().replace(/\/+$/, '')
}
