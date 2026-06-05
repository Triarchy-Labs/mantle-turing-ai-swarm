export default async function handler(request, response) {
  try {
    const res = await fetch('https://mantle-swarm-engine.onrender.com/health');
    const status = res.status;
    const body = await res.text().catch(() => '');
    
    return response.status(200).json({
      success: true,
      status,
      backend_status: body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return response.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
