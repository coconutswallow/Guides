/* ============================================
   MONSTER LIBRARY & FILTER STYLES
   Extracted from v1 index.html
   ============================================ */

/* --- Filter Container --- */
.filter-container {
  background: var(--color-bg-light); /* Matches your theme variable */
  border: 2px solid var(--color-primary);
  border-radius: 0px;
  padding: 1.5em;
  margin: 2em 0;
  display: flex;
  flex-wrap: wrap;
  gap: 1em;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  flex: 1;
  min-width: 150px;
}

.filter-group label {
  font-family: var(--font-header);
  font-weight: 700;
  color: var(--color-primary);
  text-transform: uppercase;
  font-size: 0.9em;
  letter-spacing: 0.5px;
}

.filter-select,
.filter-input {
  padding: 0.5em;
  border: 2px solid var(--color-primary);
  border-radius: 0px;
  background: white;
  font-family: var(--font-body);
  font-size: 1em;
  color: var(--color-primary);
  width: 100%;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: var(--color-secondary);
  box-shadow: 0 0 0 2px rgba(88, 24, 13, 0.2);
}

.reset-button {
  padding: 0.5em 1.5em;
  background: var(--color-primary);
  color: #FDF1DC;
  border: none;
  border-radius: 0px;
  font-family: var(--font-header);
  font-size: 0.9em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.2s;
  height: fit-content;
}

.reset-button:hover {
  background: var(--color-secondary);
}

.monster-count {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--color-primary);
  margin: 1em 0;
  font-size: 0.95em;
}

/* --- Monster Card Grid --- */
.monster-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1em;
}

/* Flexbox Layout for Image + Text Side-by-Side */
.monster-card {
  display: flex !important; /* Force flex to align image left */
  flex-direction: row;
  gap: 1em;
  align-items: center;
  background: var(--color-bg-light);
  border: 2px solid var(--color-primary);
  padding: 0.75em;
  border-radius: 0px;
  transition: transform 0.2s, box-shadow 0.2s;
  text-align: left;
}

.monster-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

/* Fixed Thumbnail Size */
.monster-card-image {
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  overflow: hidden;
  border: 2px solid var(--color-primary);
  border-radius: 0px;
  background: #ccc; /* Placeholder color */
}

.monster-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.monster-card-content {
  flex: 1;
  min-width: 0;
}

.monster-card h3 {
  margin: 0 0 0.2em 0;
  font-size: 1.2em;
  line-height: 1.2;
}

.monster-card h3 a {
  text-decoration: none;
  color: var(--color-primary);
}

.monster-card h3 a:hover {
  text-decoration: underline;
}

.monster-cr {
  font-weight: bold;
  color: var(--color-secondary);
  margin: 0;
  font-size: 0.9em;
}

.monster-type {
  font-style: italic;
  color: var(--color-text-secondary);
  margin: 0;
  font-size: 0.85em;
}

/* Mobile Styling */
@media (max-width: 768px) {
  .filter-container {
    flex-direction: column;
    align-items: stretch;
  }
  .monster-list {
    grid-template-columns: 1fr; 
  }
}