import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { Delivery, Shipment } from '../../models/models';
import { saoPauloDate } from '../monthly-summary/monthly-summary';
import { driverHistory } from './driver-history';

@Component({
  selector: 'app-driver-history', standalone: true, imports: [CommonModule],
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
  history = driverHistory([], [], '', this.year, this.month);
  readonly weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  ngOnChanges(): void { this.refresh(); }
  get monthLabel(): string { return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(this.year, this.month, 1))); }
  get blanks(): number[] { return Array.from({ length: this.history.offset }, (_, index) => index); }
  get selected() { return this.history.days[this.selectedDay - 1]; }
  get selectedLabel(): string { return `${String(this.selectedDay).padStart(2, '0')}/${String(this.month + 1).padStart(2, '0')}/${this.year}`; }
  shipmentDate(date: string): string { const parts = date.split('-'); return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date; }
  selectDay(day: number): void { this.selectedDay = day; this.refresh(); }
  changeMonth(delta: number): void {
    const date = new Date(Date.UTC(this.year, this.month + delta, 1));
    this.year = date.getUTCFullYear(); this.month = date.getUTCMonth(); this.selectedDay = 1; this.refresh();
  }
  currentMonth(): void {
    this.today = saoPauloDate(new Date());
    this.year = Number(this.today.slice(0, 4)); this.month = Number(this.today.slice(5, 7)) - 1; this.selectedDay = Number(this.today.slice(-2)); this.refresh();
  }
  private refresh(): void {
    const now = new Date();
    this.today = saoPauloDate(now);
    this.history = driverHistory(this.deliveries, this.shipments, this.driverId, this.year, this.month, now);
  }
}
