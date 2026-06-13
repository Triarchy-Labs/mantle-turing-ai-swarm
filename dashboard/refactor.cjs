const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The regex needs to capture the article tag, its classes, role/aria, and then the content, and finally the bottom info.
// We want to pull the shape-* and align-right classes into the wrapper div, and keep bento-card in the article.

code = code.replace(
  /<article className="bento-card ([^"]+)"([^>]*)>([\s\S]*?)<div className="lusion-bottom-info">\s*<h2 className="lusion-card-title">([^<]+)<\/h2>\s*<div className="lusion-card-tags">([^<]+)<\/div>\s*<\/div>\s*<\/article>/g,
  (match, classes, attrs, content, title, tags) => {
    // Extract shape-* and align-right to put on the wrapper.
    const wrapperClasses = classes.split(' ').filter(c => c.startsWith('shape-') || c === 'align-right').join(' ');
    const articleClasses = classes.split(' ').filter(c => !c.startsWith('shape-') && c !== 'align-right').join(' ');

    return `<div className="${wrapperClasses}" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
\t\t\t\t\t<article className="bento-card ${articleClasses}"${attrs} style={{ flexGrow: 1, margin: 0 }}>${content}</article>
\t\t\t\t\t<div className="lusion-external-info" style={{ padding: '0 0.5rem' }}>
\t\t\t\t\t\t<div className="lusion-card-tags" style={{ fontSize: '0.8rem', opacity: 0.5, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>${tags}</div>
\t\t\t\t\t\t<h2 className="lusion-card-title" style={{ fontSize: '1.8rem', fontWeight: 300, letterSpacing: '-0.02em', margin: 0 }}>${title}</h2>
\t\t\t\t\t</div>
\t\t\t\t</div>`;
  }
);

fs.writeFileSync('src/App.tsx', code);
console.log("Refactoring complete");
