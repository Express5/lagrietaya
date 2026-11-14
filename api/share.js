const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  const { id } = req.query;

  // Si no hay ID, redirigimos a la portada normal
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

    // 2. Extraemos los datos (con protecciones por si falta algo)
    const titulo = (campos && campos.titulo && campos.titulo.stringValue) ? campos.titulo.stringValue : 'La Grieta';
    
    let resumen = 'Descubre este artículo en La Grieta.';
    if (campos && campos.resumen && campos.resumen.stringValue) resumen = campos.resumen.stringValue;
    else if (campos && campos.subtitulo && campos.subtitulo.stringValue) resumen = campos.subtitulo.stringValue;

    let imagen = '';
    if (campos && campos.url && campos.url.stringValue) imagen = campos.url.stringValue;
    else if (campos && campos.thumbnail && campos.thumbnail.stringValue) imagen = campos.thumbnail.stringValue;
    else if (campos && campos.imagen && campos.imagen.stringValue) imagen = campos.imagen.stringValue;

    // Si la imagen es relativa (ej: "foto.jpg"), le ponemos el dominio absoluto
    if (imagen && !imagen.startsWith('http')) {
      imagen = `https://lagrietaapp.org/${imagen.replace(/^\//, '')}`;
    }
    // Si no hay imagen, usamos tu cabecera
    if (!imagen) {
      imagen = 'https://lagrietaapp.org/lagrietaheader.jpg';
    }

    // Limpiamos comillas para que no rompan el HTML
    const safeTitulo = titulo.replace(/"/g, '&quot;');
    const safeResumen = resumen.replace(/"/g, '&quot;');

    // 3. Leemos tu index.html
    const htmlPath = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    // 4. Preparamos las etiquetas Open Graph
    const ogTags = `
    <meta property="og:title" content="${safeTitulo}" />
    <meta property="og:description" content="${safeResumen}" />
    <meta property="og:image" content="${imagen}" />
    <meta property="og:url" content="https://lagrietaapp.org/?id=${id}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image">
    `;

    // 5. Reemplazamos las etiquetas antiguas por las nuevas
    html = html.replace(/<meta property="og:title" content="[^"]*" \/>/, ogTags);
    html = html.replace(/<meta property="og:description" content="[^"]*" \/>/, ''); 

    // 6. Entregamos el HTML modificado
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);

  } catch (error) {
    console.error('Error en share.js:', error);
    // Si falla, enviamos al usuario a la portada
    res.redirect('/');
  }
};
