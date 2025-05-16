/**
 * Editor de contenido simple con herramientas para formatear HTML
 */
export class ContentEditor {
  /**
   * Constructor
   * @param {HTMLElement} container - Contenedor donde inicializar el editor
   */
  constructor(container) {
    this.container = container;
    this.init();
  }

  /**
   * Inicializa el editor
   */
  init() {
    try {
      // Crear toolbar
      const toolbar = document.createElement('div');
      toolbar.className = 'editor-toolbar';
      
      // Botones de formato
      toolbar.innerHTML = `
        <div class="editor-toolbar-group">
          <button type="button" data-command="bold" title="Negrita"><strong>B</strong></button>
          <button type="button" data-command="italic" title="Cursiva"><em>I</em></button>
          <button type="button" data-command="underline" title="Subrayado"><u>U</u></button>
        </div>
        
        <div class="editor-toolbar-group">
          <button type="button" data-command="formatBlock" data-value="h1" title="Título 1">H1</button>
          <button type="button" data-command="formatBlock" data-value="h2" title="Título 2">H2</button>
          <button type="button" data-command="formatBlock" data-value="h3" title="Título 3">H3</button>
          <button type="button" data-command="formatBlock" data-value="p" title="Párrafo">P</button>
        </div>
        
        <div class="editor-toolbar-group">
          <button type="button" data-command="insertUnorderedList" title="Lista con viñetas">• Lista</button>
          <button type="button" data-command="insertOrderedList" title="Lista numerada">1. Lista</button>
        </div>
        
        <div class="editor-toolbar-group">
          <button type="button" data-command="createLink" title="Insertar enlace">🔗 Enlace</button>
          <button type="button" data-command="insertImage" title="Insertar imagen">🖼️ Imagen</button>
        </div>
        
        <div class="editor-toolbar-group">
          <button type="button" data-command="undo" title="Deshacer">↩️</button>
          <button type="button" data-command="redo" title="Rehacer">↪️</button>
        </div>
        
        <div class="editor-toolbar-group">
          <button type="button" data-command="showHTML" title="Ver HTML">{ }</button>
        </div>
      `;
      
      // Crear área editable
      const editorArea = document.createElement('div');
      editorArea.className = 'editor-area';
      editorArea.contentEditable = true;
      editorArea.style.minHeight = '300px';
      editorArea.style.border = '1px solid #ddd';
      editorArea.style.padding = '10px';
      editorArea.style.marginTop = '10px';
      
      // Crear textarea para modo HTML (oculto inicialmente)
      const htmlArea = document.createElement('textarea');
      htmlArea.className = 'editor-html-area';
      htmlArea.style.display = 'none';
      htmlArea.style.width = '100%';
      htmlArea.style.minHeight = '300px';
      htmlArea.style.padding = '10px';
      htmlArea.style.marginTop = '10px';
      htmlArea.style.fontFamily = 'monospace';
      
      // Crear campo oculto para guardar el contenido
      const hiddenField = document.createElement('input');
      hiddenField.type = 'hidden';
      hiddenField.className = 'editor-content';
      
      // Añadir todo al contenedor
      this.container.appendChild(toolbar);
      this.container.appendChild(editorArea);
      this.container.appendChild(htmlArea);
      this.container.appendChild(hiddenField);
      
      // Guardar referencias
      this.toolbar = toolbar;
      this.editorArea = editorArea;
      this.htmlArea = htmlArea;
      this.hiddenField = hiddenField;
      
      // Configurar eventos
      this.setupEvents();
      
      console.log('Editor inicializado correctamente');
    } catch (error) {
      console.error('Error al inicializar editor:', error);
    }
  }

  /**
   * Configura los eventos para los botones del editor
   */
  setupEvents() {
    try {
      // Eventos para los botones de la toolbar
      const buttons = this.toolbar.querySelectorAll('button');
      buttons.forEach(button => {
        button.addEventListener('click', () => {
          const command = button.dataset.command;
          const value = button.dataset.value || null;
          
          if (command === 'showHTML') {
            this.toggleHtmlView();
          } else if (command === 'createLink') {
            const url = prompt('Ingrese la URL del enlace:');
            if (url) {
              document.execCommand('createLink', false, url);
            }
          } else if (command === 'insertImage') {
            const url = prompt('Ingrese la URL de la imagen:');
            if (url) {
              document.execCommand('insertImage', false, url);
            }
          } else {
            document.execCommand(command, false, value);
          }
          
          // Actualizar campo oculto
          this.updateContent();
        });
      });
      
      // Evento para mantener actualizado el campo oculto
      this.editorArea.addEventListener('input', () => {
        this.updateContent();
      });
      
      // Evento para sincronizar el HTML con el área editable
      this.htmlArea.addEventListener('input', () => {
        this.editorArea.innerHTML = this.htmlArea.value;
        this.updateContent();
      });
      
      console.log('Eventos del editor configurados');
    } catch (error) {
      console.error('Error al configurar eventos del editor:', error);
    }
  }

  /**
   * Alterna entre vista normal y vista HTML
   */
  toggleHtmlView() {
    if (this.htmlArea.style.display === 'none') {
      // Cambiar a vista HTML
      this.htmlArea.value = this.editorArea.innerHTML;
      this.editorArea.style.display = 'none';
      this.htmlArea.style.display = 'block';
    } else {
      // Cambiar a vista normal
      this.editorArea.innerHTML = this.htmlArea.value;
      this.htmlArea.style.display = 'none';
      this.editorArea.style.display = 'block';
    }
  }

  /**
   * Actualiza el campo oculto con el contenido actual
   */
  updateContent() {
    if (this.htmlArea.style.display === 'none') {
      this.hiddenField.value = this.editorArea.innerHTML;
    } else {
      this.hiddenField.value = this.htmlArea.value;
    }
  }

  /**
   * Establece el contenido del editor
   * @param {string} content - Contenido HTML
   */
  setContent(content) {
    try {
      // Establecer contenido en el área editable
      this.editorArea.innerHTML = content || '';
      
      // Actualizar textarea de HTML y campo oculto
      this.htmlArea.value = content || '';
      this.hiddenField.value = content || '';
      
      console.log('Contenido establecido en el editor');
    } catch (error) {
      console.error('Error al establecer contenido en el editor:', error);
    }
  }

  /**
   * Obtiene el contenido actual del editor
   * @returns {string} Contenido HTML
   */
  getContent() {
    return this.hiddenField.value;
  }

  /**
   * Destruye el editor y limpia los recursos
   */
  destroy() {
    try {
      // Limpiar eventos y DOM
      const buttons = this.toolbar.querySelectorAll('button');
      buttons.forEach(button => {
        button.removeEventListener('click', null);
      });
      
      this.editorArea.removeEventListener('input', null);
      this.htmlArea.removeEventListener('input', null);
      
      // Eliminar elementos
      this.container.innerHTML = '';
      
      console.log('Editor destruido correctamente');
    } catch (error) {
      console.error('Error al destruir editor:', error);
    }
  }
}
