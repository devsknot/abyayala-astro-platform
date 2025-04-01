// Editor de contenido para el CMS
export class ContentEditor {
  constructor(container, initialContent = '') {
    this.container = container;
    this.content = initialContent;
    this.init();
  }
  
  init() {
    // Crear la estructura del editor
    this.container.innerHTML = `
      <div class="editor-container">
        <div class="editor-toolbar">
          <button type="button" data-action="bold" title="Negrita">B</button>
          <button type="button" data-action="italic" title="Cursiva">I</button>
          <button type="button" data-action="heading" data-level="1" title="Título 1">H1</button>
          <button type="button" data-action="heading" data-level="2" title="Título 2">H2</button>
          <button type="button" data-action="heading" data-level="3" title="Título 3">H3</button>
          <button type="button" data-action="list" data-type="bullet" title="Lista con viñetas">•</button>
          <button type="button" data-action="list" data-type="number" title="Lista numerada">1.</button>
          <button type="button" data-action="link" title="Enlace">🔗</button>
          <button type="button" data-action="image" title="Imagen">🖼️</button>
          <button type="button" data-action="quote" title="Cita">❝</button>
        </div>
        <div class="editor-content" contenteditable="true"></div>
      </div>
    `;
    
    // Obtener referencias a los elementos
    this.editorContent = this.container.querySelector('.editor-content');
    this.toolbar = this.container.querySelector('.editor-toolbar');
    
    // Establecer el contenido inicial
    this.editorContent.innerHTML = this.content;
    
    // Configurar eventos
    this.setupEvents();
  }
  
  setupEvents() {
    // Eventos para los botones de la barra de herramientas
    this.toolbar.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (!button) return;
      
      const action = button.dataset.action;
      
      switch (action) {
        case 'bold':
          this.formatText('bold');
          break;
        case 'italic':
          this.formatText('italic');
          break;
        case 'heading':
          this.formatHeading(button.dataset.level);
          break;
        case 'list':
          this.formatList(button.dataset.type);
          break;
        case 'link':
          this.insertLink();
          break;
        case 'image':
          this.insertImage();
          break;
        case 'quote':
          this.formatQuote();
          break;
      }
    });
    
    // Eventos para el contenido editable
    this.editorContent.addEventListener('input', () => {
      this.content = this.editorContent.innerHTML;
      // Disparar evento de cambio
      this.container.dispatchEvent(new CustomEvent('editor-change', {
        detail: { content: this.content }
      }));
    });
  }
  
  // Métodos para formatear texto
  formatText(style) {
    document.execCommand(style, false, null);
    this.editorContent.focus();
  }
  
  formatHeading(level) {
    document.execCommand('formatBlock', false, `h${level}`);
    this.editorContent.focus();
  }
  
  formatList(type) {
    const command = type === 'bullet' ? 'insertUnorderedList' : 'insertOrderedList';
    document.execCommand(command, false, null);
    this.editorContent.focus();
  }
  
  formatQuote() {
    document.execCommand('formatBlock', false, 'blockquote');
    this.editorContent.focus();
  }
  
  // Métodos para insertar elementos
  insertLink() {
    const url = prompt('Ingresa la URL del enlace:');
    if (url) {
      document.execCommand('createLink', false, url);
    }
    this.editorContent.focus();
  }
  
  insertImage() {
    // En una implementación real, esto abriría la biblioteca de medios
    const url = prompt('Ingresa la URL de la imagen:');
    if (url) {
      document.execCommand('insertImage', false, url);
    }
    this.editorContent.focus();
  }
  
  // Métodos para obtener y establecer contenido
  getContent() {
    return this.editorContent.innerHTML;
  }
  
  setContent(html) {
    this.editorContent.innerHTML = html;
    this.content = html;
  }
  
  // Convertir el contenido HTML a Markdown
  getMarkdown() {
    // En una implementación real, usaríamos una biblioteca como turndown
    // Por ahora, devolvemos el HTML como está
    return this.content;
  }
}
