import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, Input, OnChanges } from '@angular/core';
import { Delivery, Shipment } from '../../models/models';
import { saoPauloDate } from '../monthly-summary/monthly-summary';
import { driverHistory, driverPeriod } from './driver-history';

@Component({
  selector: 'app-driver-history', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './driver-history.component.html', styleUrls: ['./driver-history.component.css']
})
export class DriverHistoryComponent implements OnChanges {
  @Input() deliveries: Delivery[] = [];
  @Input() shipments: Shipment[] = [];
  @Input() driverId = '';
  @Input() unavailable = false;
  today = saoPauloDate(new Date());
  year = Number(this.today.slice(0, 4));
  month = Number(this.today.slice(5, 7)) - 1;
  selectedDay = Number(this.today.slice(-2));
  mode: 'day' | 'period' = 'day';
  startDate = this.today;
  endDate = this.today;
  get rangeError(): string { return !this.startDate || !this.endDate ? 'Selecione as duas datas.' : this.startDate > this.endDate ? 'A data final deve ser igual ou posterior à inicial.' : ''; }
  get summary() { return this.mode === 'day' ? this.selected : driverPeriod(this.deliveries, this.driverId, this.startDate, this.endDate); }
  get summaryLabel(): string { return this.mode === 'day' ? this.selectedLabel : `${this.startDate.split('-').reverse().join('/')} a ${this.endDate.split('-').reverse().join('/')}`; }
  setMode(mode: 'day' | 'period'): void {
    this.mode = mode;
    if (mode === 'period') { this.startDate = this.selected.key; this.endDate = this.selected.key; }
  }
  week(): void {
    const date = new Date(`${this.selected.key}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    this.startDate = date.toISOString().slice(0, 10);
    date.setUTCDate(date.getUTCDate() + 6);
    this.endDate = date.toISOString().slice(0, 10); this.mode = 'period';
  }
  wholeMonth(): void {
    this.startDate = this.history.days[0].key;
    this.endDate = this.history.days[this.history.days.length - 1].key;
    this.mode = 'period';
  }
  history = driverHistory([], [], '', this.year, this.month);
  readonly weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  ngOnChanges(): void { this.refresh(); }
  get monthLabel(): string { return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(this.year, this.month, 1))); }
  get blanks(): number[] { return Array.from({ length: this.history.offset }, (_, index) => index); }
  get selected() { return this.history.days[this.selectedDay - 1]; }
  get selectedLabel(): string { return `${String(this.selectedDay).padStart(2, '0')}/${String(this.month + 1).padStart(2, '0')}/${this.year}`; }
  selectDay(day: number): void { this.selectedDay = day; this.mode = 'day'; this.refresh(); }
  changeMonth(delta: number): void {
    const date = new Date(Date.UTC(this.year, this.month + delta, 1));
    this.year = date.getUTCFullYear(); this.month = date.getUTCMonth(); this.selectedDay = 1; this.refresh();
  }
  currentMonth(): void {
    this.mode = 'day';
    this.today = saoPauloDate(new Date());
    this.year = Number(this.today.slice(0, 4)); this.month = Number(this.today.slice(5, 7)) - 1; this.selectedDay = Number(this.today.slice(-2)); this.refresh();
  }
  private refresh(): void {
    const now = new Date();
    this.today = saoPauloDate(now);
    this.history = driverHistory(this.deliveries, this.shipments, this.driverId, this.year, this.month, now);
  }
}
