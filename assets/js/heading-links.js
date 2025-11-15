/**
* Creates anchor links for all headings (h1, h2, etc.) on the page that have an ID.
*  
* Wait for the browser to finish parsing the HTML document before running the script.
 * This ensures that all the heading elements we want to select are available (in the DOM).
 * 'DOMContentLoaded' is a reliable event for this, as it doesn't wait for images or CSS.
 */
document.addEventListener('DOMContentLoaded', function() {
  
  // Find all heading elements (h1, h2, etc.) that have an 'id' attribute.
  // We specifically need the 'id' because that's what we use to create the anchor link.
  const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
  
  // Loop through each of the heading elements found on the page.
  headings.forEach(heading => {
    
    // Create a new anchor (<a>) element in memory. This element doesn't
    // exist on the page yet; it's just an object.
    const link = document.createElement('a');
    
    // Add a CSS class to the link. This is how you can style the link
    // using your CSS file (e.g., to make it a '#' symbol, hide it until hover, etc.).
    link.className = 'heading-link';
    
    // Set the link's 'href' attribute to be a "hash link"
    // that points to the heading's own ID.
    // This is what makes it a functional anchor link.
    link.href = '#' + heading.id;
    
    // Add an 'aria-label' for accessibility. This text will be read by
    // screen readers to help users with visual impairments understand
    // what this (often visual-only) link does.
    link.setAttribute('aria-label', 'Link to this section');
    
    /**
     * --- Optional Feature: Copy link to clipboard ---
     *
     * This adds a "click" event listener to the link. When a user clicks it,
     * we will copy the full, absolute URL to their clipboard.
     */
    link.addEventListener('click', function(e) {
      
      // Stop the browser's default behavior for this click.
      // Normally, clicking this link would just jump the page to the anchor.
      // We want to *prevent* that jump and run our custom "copy" logic instead.
      e.preventDefault();
      
      // Build the complete URL.
      // - window.location.origin: "https://www.example.com"
      // - window.location.pathname: "/my-cool-page"
      // - '#' + heading.id: "#my-section-title"
      // Result: "https://www.example.com/my-cool-page#my-section-title"
      const fullUrl = window.location.origin + window.location.pathname + '#' + heading.id;
      
      // Use the modern, asynchronous Clipboard API to write the URL text.
      // This returns a "Promise", so we use .then() to run code after it succeeds.
      navigator.clipboard.writeText(fullUrl).then(() => {
        
        // This is a great place to show a small "Copied!" tooltip or notification
        // to the user. For this example, we'll just log to the console.
        console.log('Link copied!');
      }).catch(err => {
        // It's always good practice to handle potential errors.
        // For example, the user might have denied clipboard permissions.
        console.error('Failed to copy link: ', err);
      });
    });
    
    // Finally, take the 'link' object we created in memory and
    // add it to the actual page. We "append" it as the last child
    // *inside* the heading element.
    //
    // Before: <h2 id="my-section">My Section</h2>
    // After:  <h2 id="my-section">My Section<a class="heading-link" ...></a></h2>
    heading.appendChild(link);
  });
});