module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.redirect(302, 'https://lagrietaapp.org/');
  }

  try {
    // 1. Buscamos el artículo directamente en la API REST de Firestore
    const urlFirestore = `https://firestore.googleapis.com/v1/projects/la-grieta-71193/databases/(default)/documents/articulos/${id}`;
    const respuesta = await fetch(urlFirestore);

    if (!respuesta.ok) throw new Error('Artículo no encontrado en Firestore');

    const datos = await respuesta.json();
    const campos = datos.fields || {};

    // 2. Extraemos los campos de forma segura
    const titulo = campos.titulo?.stringValue || 'La Grieta';
    const resumen = campos.resumen?.stringValue || campos.subtitulo?.stringValue || 'Descubre este artículo en La Grieta.';
    
    let imagen = campos.url?.stringValue || campos.thumbnail?.stringValue || campos.imagen?.stringValue || '';

    if (imagen && !imagen.startsWith('http')) {
      imagen = `https://lagrietaapp.org/${imagen.replace(/^\//, '')}`;
    }
    if (!imagen) {
      imagen = 'https://lagrietaapp.org/lagrietaheader.jpg';
    }

    const safeTitulo = titulo.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeResumen = resumen.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 3. Generamos un HTML estricto con las etiquetas Open Graph para WhatsApp (sin depender de leer archivos locales)
    const htmlResponse = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${safeTitulo} · La grieta</title>
    <meta property="og:title" content="${safeTitulo}" />
    <meta property="og:description" content="${safeResumen}" />
    <meta property="og:image" content="${imagen}" />
    <meta property="og:url" content="https://lagrietaapp.org/?id=${id}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitulo}">
    <meta name="twitter:description" content="${safeResumen}">
    <meta name="twitter:image" content="${imagen}">
    <!-- Redirección automática inmediata para usuarios reales que entren al enlace -->
    <meta http-equiv="refresh" content="0;url=https://lagrietaapp.org/?id=${id}">
</head>
<body>
    <script>
        window.location.replace("https://lagrietaapp.org/?id=" + "${id}");
    </script>
    <p>Redirigiendo a <a href="https://lagrietaapp.org/?id=${id}">${safeTitulo}</a>...</p>
</body>
</html>`;

    // 4. Devolvemos el HTML con las cabeceras ideales para los bots y la caché
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).send(htmlResponse);

  } catch (error) {
    console.error('Error en article-share.js:', error);
    return res.redirect(302, 'https://lagrietaapp.org/');
  }
};
