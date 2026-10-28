module.exports = async function handler(req, res) {
  // 1. Permitir peticiones desde tu web (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Obtener la URL de destino
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Falta el parámetro url' });
  }

  try {
    // 3. Hacer la petición con CABECERAS DE NAVEGADOR REAL (Esto engaña a Goodreads)
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      redirect: 'follow'
    });

    // 4. Obtener el texto (sea XML válido o HTML de error)
    const data = await response.text();

    // 5. Devolver los datos a tu web
    res.setHeader('Content-Type', response.headers.get('content-type') || 'text/xml');
    return res.status(200).send(data);

  } catch (error) {
    console.error("Error en proxy Vercel:", error);
    return res.status(500).json({ error: 'Error interno del proxy' });
  }
};
