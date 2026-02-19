document.addEventListener('DOMContentLoaded', () => {
  fetch('data.json')
    .then(response => response.json())
    .then(data => {
      populateResearch(data.research || []);
      populateProjects(data.projects || []);
      populateTeaching(data.teaching || []);
    })
    .catch(err => console.error('Error loading JSON data:', err));

  function populateResearch(researchItems) {
    const target = document.querySelector('#research #content');
    if (!target) return;
    target.innerHTML = '';

    const ul = document.createElement('ul');
    researchItems.forEach(item => {
      const li = document.createElement('li');

      const h3 = document.createElement('h3');
      h3.textContent = item.title;
      li.appendChild(h3);

      const divPub = document.createElement('div');
      divPub.id = 'publications';

      // Authors
      if (Array.isArray(item.authors)) {
        const authorHtml = item.authors.map(author => {
          if (typeof author === 'string') return author;
          if (author && typeof author === 'object') {
            const { name, url } = author;
            if (url) {
              return `<a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>`;
            }
            return name;
          }
          return '';
        }).join(', ');
        divPub.innerHTML = `${authorHtml}<br>`;
      }

      // Links (e.g., arXiv, DOI)
      if (item.links && typeof item.links === 'object') {
        Object.entries(item.links).forEach(([name, url]) => {
          if (url) {
            const a = document.createElement('a');
            a.href = url;
            a.textContent = name;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            divPub.appendChild(a);
          } else {
            const span = document.createElement('span');
            span.textContent = name;
            divPub.appendChild(span);
          }
          divPub.appendChild(document.createElement('br'));
        });
      }

      // Venue / extra info
      if (item.venue) {
        const spanVenue = document.createElement('span');
        spanVenue.textContent = item.venue;
        divPub.appendChild(spanVenue);
      }

      li.appendChild(divPub);
      ul.appendChild(li);
    });

    target.appendChild(ul);
  }

  function populateProjects(projectItems) {
    const target = document.querySelector('#projects #content');
    if (!target) return;
    target.innerHTML = '';

    const ul = document.createElement('ul');
    projectItems.forEach(item => {
      const li = document.createElement('li');

      const h3 = document.createElement('h3');
      const link = document.createElement('a');
      link.href = item.url;
      link.textContent = item.name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      h3.appendChild(link);
      li.appendChild(h3);

      if (item.description) {
        const p = document.createElement('p');
        p.innerHTML = item.description;
        li.appendChild(p);
      }

      ul.appendChild(li);
    });

    target.appendChild(ul);
  }

  function populateTeaching(teachingItems) {
    const target = document.querySelector('#teaching #content');
    if (!target) return;
    target.innerHTML = '';

    const ul = document.createElement('ul');
    teachingItems.forEach(item => {
      const li = document.createElement('li');

      const semester = document.createElement('strong');
      semester.textContent = item.semester;
      li.appendChild(semester);

      li.appendChild(document.createTextNode(' - '));

      const role = document.createElement('span');
      role.textContent = item.role;
      li.appendChild(role);

      li.appendChild(document.createTextNode(' - '));

      const course = document.createElement('span');
      course.textContent = item.course;
      li.appendChild(course);

      if (item.notes) {
        const notes = document.createElement('span');
        notes.textContent = ' ' + item.notes;
        li.appendChild(notes);
      }

      ul.appendChild(li);
    });

    target.appendChild(ul);
  }
}); 