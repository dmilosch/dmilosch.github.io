(() => {
  'use strict';
  const root = document.getElementById('rsvp-app');
  const configured = window.WEDDING?.rsvp?.apiBase?.trim();
  if (!root || !configured) return;
  let base;
  try {
    const url = new URL(configured);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) return;
    base = url.origin;
  } catch { return; }
  let code = '', invitation, settings, draft, form;
  const make = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const button = (text, action, secondary = false) => {
    const element = make('button', text, secondary ? 'rsvp-secondary' : 'gold-button');
    element.type = 'button'; element.addEventListener('click', action); return element;
  };
  const status = make('p', '', 'rsvp-status');
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.tabIndex = -1;
  const message = (text, error = false) => { status.textContent = text; status.classList.toggle('rsvp-error', error); };
  const show = (...elements) => { root.replaceChildren(...elements, status); message(''); };
  const focus = element => { if (location.hash.startsWith('#rsvp')) element.focus(); };
  async function api(path, body, token) {
    const headers = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    let response;
    try { response = await fetch(`${base}${path}`, { method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(20000) }); }
    catch { throw new Error('We could not reach the RSVP service. Please check your connection and try again.'); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(data.error || 'We could not save your reply. Please try again.'); error.status = response.status; throw error; }
    return data;
  }
  function contactNote() {
    const note = make('p', 'Please contact us if you need help with your invitation.', 'rsvp-help');
    if (settings?.contactEmail) {
      const link = make('a', settings.contactEmail, 'text-link'); link.href = `mailto:${settings.contactEmail}`;
      note.append(' ', link);
    }
    return note;
  }
  function login() {
    invitation = null; draft = null; code = '';
    const entry = make('form');
    const label = make('label', 'Your invitation code'); label.htmlFor = 'invitation-code';
    const input = make('input', '', 'rsvp-code'); input.id = 'invitation-code'; input.name = 'code'; input.type = 'text'; input.required = true; input.maxLength = 40; input.autocomplete = 'off'; input.spellcheck = false; input.placeholder = 'Code from your invitation';
    const submit = make('button', 'Find my invitation', 'gold-button'); submit.type = 'submit';
    entry.append(label, input, make('p', 'Enter the code from your invitation, or open your personal RSVP link.', 'rsvp-help'), submit);
    entry.addEventListener('submit', async event => {
      event.preventDefault(); submit.disabled = true; message('Finding your invitation…');
      try { await lookup(input.value); } catch (error) { message(error.message, true); focus(status); } finally { submit.disabled = false; }
    });
    show(entry, contactNote());
    if (!settings.open) message(settings.closedMessage);
  }
  async function lookup(value) {
    const data = await api('/api/invitation', { code: value });
    code = value; invitation = data.invitation; settings = data.settings;
    draft = invitation.response || { guests: invitation.guests.map(g => ({ id: g.id, name: g.is_plus_one ? '' : g.name, attending: '', ceremonyAttending: '', meal: '', dietary: '' })), childrenMeals: 0, email: '', message: '' };
    edit();
  }
  function field(container, labelText, name, value, { type = 'text', options, required = false, maxLength = 1000 } = {}) {
    const wrapper = make('div', '', 'rsvp-field');
    const label = make('label', labelText); label.htmlFor = name;
    const input = make(options ? 'select' : type === 'textarea' ? 'textarea' : 'input'); input.id = name; input.name = name; input.required = required;
    if (options) {
      const blank = make('option', 'Please choose'); blank.value = ''; input.append(blank);
      for (const choice of options) { const option = make('option', choice); option.value = choice; input.append(option); }
    } else { if (type !== 'textarea') input.type = type; input.maxLength = maxLength; }
    input.value = value ?? ''; wrapper.append(label, input); container.append(wrapper); return { wrapper, input };
  }
  function attendanceChoices(container, question, name, value) {
    const group = make('div', '', 'rsvp-question'); group.setAttribute('role', 'group');
    const prompt = make('p', question); prompt.id = `${name}-question`; group.setAttribute('aria-labelledby', prompt.id);
    const choices = make('div', '', 'rsvp-choices');
    for (const [choice, labelText] of [['yes', 'Yes'], ['no', 'No']]) {
      const label = make('label'), radio = make('input');
      radio.type = 'radio'; radio.name = name; radio.value = choice; radio.required = true; radio.checked = value === choice;
      label.append(radio, document.createTextNode(labelText)); choices.append(label);
    }
    group.append(prompt, choices); container.append(group); return choices;
  }
  function readDraft() {
    const data = new FormData(form);
    return { version: invitation.version, guests: invitation.guests.map(g => ({ id: g.id, name: data.get(`name-${g.id}`) || '', attending: data.get(`attendance-${g.id}`), ...(invitation.ceremonyInvited ? { ceremonyAttending: data.get(`ceremony-${g.id}`) } : {}), ...(invitation.ceremonyInvited && data.get(`ceremony-${g.id}`) === 'yes' ? { transportation: data.get(`transportation-${g.id}`) } : {}), meal: data.get(`meal-${g.id}`) || '', dietary: data.get(`dietary-${g.id}`) || '' })), childrenMeals: Number(data.get('children-meals') || 0), email: data.get('reply-email') || '', message: data.get('reply-message') || '' };
  }
  function edit() {
    if (!settings.open) {
      const panel = make('div', '', 'rsvp-panel'); panel.append(make('p', settings.closedMessage));
      if (invitation.response) panel.append(make('p', 'Your previous reply is saved. Please contact us if you need to change it.', 'rsvp-help'));
      show(panel, contactNote(), button('Use another invitation', login, true)); return;
    }
    form = make('form');
    const heading = make('h3', invitation.label); heading.tabIndex = -1;
    form.append(heading, make('p', 'Confirm the full names of everyone in your party and reply for each person below.', 'rsvp-help'));
    for (const guest of invitation.guests) {
      const response = draft.guests.find(g => g.id === guest.id) || {};
      const group = make('fieldset'); group.append(make('legend', guest.name));
      const choices = attendanceChoices(group, 'Will you be attending the wedding?', `attendance-${guest.id}`, response.attending);
      const ceremony = invitation.ceremonyInvited ? attendanceChoices(group, 'Will you be attending the ceremony?', `ceremony-${guest.id}`, response.ceremonyAttending) : null;
      const transportation = ceremony ? attendanceChoices(group, 'Do you want to use our transportation system to the ceremony and then to the party?', `transportation-${guest.id}`, response.transportation) : null;
      const fullName = field(group, 'Confirm full name', `name-${guest.id}`, response.name ?? (guest.is_plus_one ? '' : guest.name), { required: true, maxLength: 120 });
      fullName.input.autocomplete = 'off';
      const fields = make('div'); group.append(fields);
      if (settings.mealChoices.length) field(fields, 'Meal choice', `meal-${guest.id}`, response.meal, { required: true, options: settings.mealChoices });
      if (settings.askDietaryRequirements) field(fields, 'Dietary restrictions/allergies (optional)', `dietary-${guest.id}`, response.dietary, { type: 'textarea' });
      const update = () => {
        const attending = choices.querySelector('input:checked')?.value === 'yes';
        const attendingCeremony = ceremony?.querySelector('input:checked')?.value === 'yes';
        if (transportation) {
          transportation.parentElement.hidden = !attendingCeremony;
          transportation.querySelectorAll('input').forEach(input => {
            input.disabled = !attendingCeremony; input.required = attendingCeremony;
            if (!attendingCeremony) input.checked = false;
          });
        }
        fullName.input.required = !guest.is_plus_one || attending || attendingCeremony;
        fields.hidden = !attending; fields.querySelectorAll('input,select,textarea').forEach(input => { input.disabled = !attending; });
      };
      choices.addEventListener('change', update); ceremony?.addEventListener('change', update); update(); form.append(group);
    }
    const children = field(form, 'Number of children’s meals', 'children-meals', draft.childrenMeals ?? 0, { type: 'number', required: true });
    children.input.min = '0'; children.input.step = '1';
    const childrenHelp = make('p', 'Enter 0 if none are needed. Count only children attending with your party.', 'rsvp-help');
    childrenHelp.id = 'children-meals-help'; children.input.setAttribute('aria-describedby', childrenHelp.id); children.wrapper.append(childrenHelp);
    const updateChildren = () => {
      const count = form.querySelectorAll('input[name^="attendance-"][value="yes"]:checked').length;
      children.wrapper.hidden = !count; children.input.disabled = !count; children.input.max = String(count);
      if (!count) children.input.value = '0';
    };
    form.addEventListener('change', updateChildren); updateChildren();
    if (settings.askContactEmail) field(form, 'Contact email (optional)', 'reply-email', draft.email, { type: 'email', maxLength: 254 });
    if (settings.askMessage) field(form, 'Any questions/Comments (optional)', 'reply-message', draft.message, { type: 'textarea', maxLength: 2000 });
    const next = make('button', 'Review my reply', 'gold-button'); next.type = 'submit'; form.append(next);
    form.addEventListener('submit', event => { event.preventDefault(); draft = readDraft(); review(); });
    show(form, make('p', 'Your reply is shared with David and Gypsy for wedding planning. Keep your invitation link or code to return and make changes.', 'rsvp-privacy'), button('Use another invitation', login, true));
    if (invitation.updatedAt) message(`Your latest saved reply: ${new Date(invitation.updatedAt).toLocaleString()}.`);
    focus(heading);
  }
  function review() {
    const panel = make('div', '', 'rsvp-panel rsvp-review'), heading = make('h3', 'Your reply, at a glance'); heading.tabIndex = -1;
    panel.append(heading); const list = make('ul');
    for (const guest of invitation.guests) {
      const reply = draft.guests.find(g => g.id === guest.id);
      const lines = [`${reply.name || guest.name}`, `Wedding: ${reply.attending === 'yes' ? 'Attending' : 'Declined'}`];
      if (invitation.ceremonyInvited) lines.push(`Ceremony: ${reply.ceremonyAttending === 'yes' ? 'Attending' : 'Declined'}`);
      if (invitation.ceremonyInvited && reply.ceremonyAttending === 'yes') lines.push(`Transportation to ceremony and party: ${reply.transportation === 'yes' ? 'Yes' : 'No'}`);
      if (reply.attending === 'yes' && reply.meal) lines.push(`Meal: ${reply.meal}`);
      if (reply.attending === 'yes' && reply.dietary) lines.push(`Dietary restrictions/allergies: ${reply.dietary}`);
      list.append(make('li', lines.join('\n')));
    }
    panel.append(list);
    panel.append(make('p', `Children’s meals: ${draft.childrenMeals}`));
    if (draft.email) panel.append(make('p', `Email: ${draft.email}`));
    if (draft.message) panel.append(make('p', `Questions/Comments: ${draft.message}`));
    const actions = make('div', '', 'rsvp-actions'), back = button('Make changes', edit, true);
    const save = button('Send our RSVP', async () => {
      save.disabled = back.disabled = true; message('Saving your reply…');
      try {
        const result = await api('/api/reply', { ...draft, version: invitation.version }, code);
        if (!result.saved) throw new Error('Your reply could not be confirmed. Please try again.');
        invitation.version = result.version; invitation.updatedAt = result.updatedAt; invitation.response = result.response; draft = result.response;
        const confirmation = make('div', result.message, 'rsvp-success'); confirmation.tabIndex = -1;
        show(confirmation, button('Update our reply', edit, true), button('Use another invitation', login, true)); focus(confirmation);
      } catch (error) {
        message(error.message, true); focus(status);
        if (error.status === 409 && !panel.querySelector('[data-reload]')) {
          const reload = button('Load the latest saved reply', async () => { reload.disabled = true; try { await lookup(code); } catch (failure) { message(failure.message, true); } finally { reload.disabled = false; } }, true);
          reload.dataset.reload = ''; panel.append(reload);
        }
      } finally { save.disabled = back.disabled = false; }
    });
    actions.append(save, back); panel.append(actions); show(panel); focus(heading);
  }
  function readLink() {
    const [page, params] = location.hash.slice(1).split('?');
    if (page !== 'rsvp' || !params) return '';
    const invitationCode = new URLSearchParams(params).get('invite') || '';
    if (invitationCode) history.replaceState(null, '', `${location.pathname}${location.search}#rsvp`);
    return invitationCode;
  }
  async function start() {
    root.hidden = false;
    // Introductory copy and fallback links are optional in the page layout.
    for (const id of ['rsvp-link', 'rsvp-pending']) {
      const element = document.getElementById(id);
      if (element) element.hidden = true;
    }
    show(); message('Loading RSVP details…');
    const linkedCode = readLink();
    try {
      settings = await api('/api/config');
      const copy = document.getElementById('rsvp-copy');
      if (copy) copy.textContent = settings.welcome;
      const deadline = document.getElementById('rsvp-deadline');
      if (deadline) {
        deadline.hidden = !settings.deadline;
        if (settings.deadline) deadline.textContent = `Please reply by ${new Date(settings.deadline).toLocaleDateString(undefined, { dateStyle: 'long' })}.`;
      }
      login();
      if (linkedCode) await lookup(linkedCode);
    } catch (error) {
      if (!settings) show(button('Try again', start), contactNote());
      message(error.message, true);
    }
  }
  window.addEventListener('hashchange', async () => {
    const value = readLink();
    if (value && settings) { try { await lookup(value); } catch (error) { message(error.message, true); } }
  });
  start();
})();
