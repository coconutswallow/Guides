document.addEventListener('DOMContentLoaded', function() {
  // Select all headings
  const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
  
  headings.forEach(heading => {
    // Create the link element
    const link = document.createElement('a');
    link.className = 'heading-link';
    link.href = '#' + heading.id;
    link.setAttribute('aria-label', 'Link to this section');
    
    // Optional: Copy full URL to clipboard on click
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const fullUrl = window.location.origin + window.location.pathname + '#' + heading.id;
      navigator.clipboard.writeText(fullUrl).then(() => {
        // Optional: Show a tooltip or notification
        console.log('Link copied!');
      });
    });
    
    heading.appendChild(link);
  });
});