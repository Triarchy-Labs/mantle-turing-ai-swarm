const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Regex to find:
// <article className="bento-card lusion-card" style={{ gridColumn: 'span X', gridRow: 'span Y' }}>
// ... (content) ...
// <div className="lusion-bottom-info">
//   <h2 className="lusion-card-title">TITLE</h2>
//   <div className="lusion-card-tags">TAGS</div>
// </div>
// </article>

// We can replace it by capturing the gridColumn/gridRow style from article,
// moving it to a wrapper div,
// and moving the lusion-bottom-info below the article.

code = code.replace(
  /<article className="bento-card lusion-card" style={{([^}]+)}}>([\s\S]*?)<div className="lusion-bottom-info">\s*<h2 className="lusion-card-title">([^<]+)<\/h2>\s*<div className="lusion-card-tags">([^<]+)<\/div>\s*<\/div>\s*<\/article>/g,
  (match, style, content, title, tags) => {
    return `<div style={{${style}, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
\t\t\t\t\t<article className="bento-card lusion-card" style={{ flexGrow: 1, margin: 0 }}>${content}</article>
\t\t\t\t\t<div className="lusion-external-info" style={{ padding: '0 0.5rem' }}>
\t\t\t\t\t\t<div className="lusion-card-tags" style={{ fontSize: '0.8rem', opacity: 0.5, letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>${tags}</div>
\t\t\t\t\t\t<h2 className="lusion-card-title" style={{ fontSize: '1.8rem', fontWeight: 300, letterSpacing: '-0.02em', margin: 0 }}>${title}</h2>
\t\t\t\t\t</div>
\t\t\t\t</div>`;
  }
);

fs.writeFileSync('src/App.tsx', code);
console.log("Refactoring complete");
