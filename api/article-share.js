const fs = require('fs');
const path = path = require('path');

module.exports = async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.redirect('/');
  }

  try {
    // 1. Buscamos el artículo en Firebase (API REST)
    const urlFirestore = `https://firestore.googleapis.com/v1/projects/la-grieta-71193/databases/(default)/documents/articulos/${id}`;
    const respuesta = await fetch(urlFirestore);

    if (!respuesta.ok) throw new Error('Artículo no encontrado');

    const datos = await respuesta.json();
    const campos = datos.fields;

    // 2. Extraemos los datos de forma segura
    const titulo = (campos && campos.titulo && campos.titulo.stringValue) ? campos.titulo.stringValue : 'La Grieta';
    
    let resumen = 'Descubre este artículo en La Grieta.';
    if (campos && campos.resumen && campos.resumen.stringValue) resumen = campos.resumen.stringValue;
    else if (campos && campos.subtitulo && campos.subtitulo.stringValue) resumen = campos.subtitulo.stringValue;

    let imagen = '';
    if (campos && campos.url && campos.url.stringValue) imagen = campos.url.stringValue;
    else if (campos && campos.thumbnail && campos.thumbnail.stringValue) imagen = campos.thumbnail.stringValue;
    else if (campos && campos.imagen && campos.imagen.stringValue) imagen = campos.imagen.stringValue;

    if (imagen && !imagen.startsWith('http')) {
      imagen = `https://lagrietaapp.org/${imagen.replace(/^\//, '')}`;
    }
    if (!imagen) {
      imagen = 'https://lagrietaapp.org/lagrietaheader.jpg';
    }

    const safeTitulo = titulo.replace(/"/g, '&quot;');
    const safeResumen = resumen.replace(/"/g, '&quot;');

    // 3. Leemos el index.html
    const htmlPath = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    // 4. Preparamos las nuevas etiquetas Open Graph
    const ogTags = `
    <meta property="og:title" content="${safeTitulo}" />
    <meta property="og:description" content="${safeResumen}" />
    <meta property="og:image" content="${imagen}" />
    <meta property="og:url" content="https://lagrietaapp.org/?id=${id}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitulo}">
    <meta name="twitter:description" content="${safeResumen}">
    <meta name="twitter:image" content="${imagen}">
    `;

    // 5. Inyección segura reemplazando el bloque o insertándolo antes del </head>
    if (html.includes('<meta property="og:title"')) {
      // Reemplazamos las etiquetas viejas por las nuevas de golpe
      html = html.replace(/<meta property="og:title"[^>]*>/g, ogTags);
      // Limpiamos las descripciones sueltas si las hubiera para que no se dupliquen
      html = html.replace(/<meta property="og:description"[^>]*>/g, '');
      html = html.replace(/<meta property="og:url"[^>]*>/g, '');
    } else {
      html = html.replace('</head>', `${ogTags}\n</head>`);
    }

    // 6. Entregamos el HTML modificado al bot de WhatsApp / navegador
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Cabecera para evitar que Vercel guarde una caché vieja si cambias de artículo
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate');
    return res.status(200).send(html);

  } catch (error) {
    console.error('Error en article-share.js:', error);
    return res.redirect('/');
  }
};
