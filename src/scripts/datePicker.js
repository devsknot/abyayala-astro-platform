/**
 * DatePicker - Un selector de calendario simple para Abya Yala
 */
class DatePicker {
  constructor(inputId) {
    this.inputId = inputId;
    this.input = document.getElementById(inputId);
    this.calendarContainer = document.getElementById(`${inputId}-calendar`);
    this.toggleButton = this.input.parentElement.querySelector('.date-picker-toggle');
    this.monthYearDisplay = this.calendarContainer.querySelector('.date-picker-month-year');
    this.daysContainer = this.calendarContainer.querySelector('.date-picker-days');
    this.prevButton = this.calendarContainer.querySelector('.date-picker-prev');
    this.nextButton = this.calendarContainer.querySelector('.date-picker-next');
    this.clearButton = this.calendarContainer.querySelector('.date-picker-clear');
    this.todayButton = this.calendarContainer.querySelector('.date-picker-today');
    this.closeButton = this.calendarContainer.querySelector('.date-picker-close');
    
    this.currentDate = new Date();
    this.selectedDate = null;
    this.viewDate = new Date();
    
    this.monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    this.init();
  }
  
  init() {
    // Inicializar eventos
    this.input.addEventListener('click', () => this.toggleCalendar());
    this.toggleButton.addEventListener('click', () => this.toggleCalendar());
    this.prevButton.addEventListener('click', () => this.prevMonth());
    this.nextButton.addEventListener('click', () => this.nextMonth());
    this.clearButton.addEventListener('click', () => this.clearDate());
    this.todayButton.addEventListener('click', () => this.selectToday());
    this.closeButton.addEventListener('click', () => this.hideCalendar());
    
    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!this.calendarContainer.contains(e.target) && 
          e.target !== this.input && 
          e.target !== this.toggleButton && 
          !this.toggleButton.contains(e.target)) {
        this.hideCalendar();
      }
    });
    
    // Renderizar el calendario inicial
    this.renderCalendar();
  }
  
  toggleCalendar() {
    if (this.calendarContainer.classList.contains('active')) {
      this.hideCalendar();
    } else {
      this.showCalendar();
    }
  }
  
  showCalendar() {
    this.calendarContainer.classList.add('active');
    this.renderCalendar();
    
    // Si hay una fecha seleccionada, mostrar ese mes
    if (this.selectedDate) {
      this.viewDate = new Date(this.selectedDate);
      this.renderCalendar();
    }
  }
  
  hideCalendar() {
    this.calendarContainer.classList.remove('active');
  }
  
  renderCalendar() {
    // Actualizar el encabezado del mes y año
    this.monthYearDisplay.textContent = `${this.monthNames[this.viewDate.getMonth()]} ${this.viewDate.getFullYear()}`;
    
    // Limpiar el contenedor de días
    this.daysContainer.innerHTML = '';
    
    // Obtener el primer día del mes
    const firstDay = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 1);
    const lastDay = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 0);
    
    // Obtener el día de la semana del primer día (0 = Domingo, 6 = Sábado)
    const firstDayOfWeek = firstDay.getDay();
    
    // Días del mes anterior
    const prevMonthLastDay = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 0).getDate();
    
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayElement = document.createElement('div');
      dayElement.classList.add('date-picker-day', 'other-month');
      dayElement.textContent = prevMonthLastDay - i;
      this.daysContainer.appendChild(dayElement);
    }
    
    // Días del mes actual
    const today = new Date();
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dayElement = document.createElement('div');
      dayElement.classList.add('date-picker-day');
      dayElement.textContent = i;
      
      // Verificar si es hoy
      if (this.viewDate.getFullYear() === today.getFullYear() && 
          this.viewDate.getMonth() === today.getMonth() && 
          i === today.getDate()) {
        dayElement.classList.add('today');
      }
      
      // Verificar si es la fecha seleccionada
      if (this.selectedDate && 
          this.viewDate.getFullYear() === this.selectedDate.getFullYear() && 
          this.viewDate.getMonth() === this.selectedDate.getMonth() && 
          i === this.selectedDate.getDate()) {
        dayElement.classList.add('selected');
      }
      
      // Evento de clic para seleccionar fecha
      dayElement.addEventListener('click', () => {
        this.selectDate(new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), i));
      });
      
      this.daysContainer.appendChild(dayElement);
    }
    
    // Días del mes siguiente
    const daysFromNextMonth = 42 - (firstDayOfWeek + lastDay.getDate());
    for (let i = 1; i <= daysFromNextMonth; i++) {
      const dayElement = document.createElement('div');
      dayElement.classList.add('date-picker-day', 'other-month');
      dayElement.textContent = i;
      this.daysContainer.appendChild(dayElement);
    }
  }
  
  prevMonth() {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
    this.renderCalendar();
  }
  
  nextMonth() {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
    this.renderCalendar();
  }
  
  selectDate(date) {
    this.selectedDate = date;
    
    // Formatear la fecha para mostrarla en el input (DD/MM/YYYY)
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    this.input.value = `${day}/${month}/${year}`;
    
    // Disparar evento de cambio
    const event = new Event('change', { bubbles: true });
    this.input.dispatchEvent(event);
    
    // Renderizar calendario y cerrar
    this.renderCalendar();
    this.hideCalendar();
  }
  
  clearDate() {
    this.selectedDate = null;
    this.input.value = '';
    
    // Disparar evento de cambio
    const event = new Event('change', { bubbles: true });
    this.input.dispatchEvent(event);
    
    this.renderCalendar();
  }
  
  selectToday() {
    const today = new Date();
    this.viewDate = new Date(today);
    this.selectDate(today);
  }
  
  // Método para obtener la fecha seleccionada en formato ISO
  getSelectedDateISO() {
    if (!this.selectedDate) return null;
    return this.selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
  }
  
  // Método para obtener la fecha seleccionada como objeto Date
  getSelectedDate() {
    return this.selectedDate;
  }
}

// Exportar la clase para usarla en otros archivos
export default DatePicker;
