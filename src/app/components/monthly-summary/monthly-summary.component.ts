import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges } from '@angular/core';
import { Delivery } from '../../models/models';
import { monthlyClosing, saoPauloDate } from './monthly-summary';

@Component({
  selector: 'app-monthly-summary', standalone: true, imports: [CommonModule],
  templateUrl: './monthly-summary.component.html', styleUrls: ['./monthly-summary.component.css']
})
export class MonthlySummaryComponent implements OnChanges {
  @Input() deliveries: Delivery[] = [];
  private today = saoPauloDate(new Date());
  year = Number(this.today.slice(0, 4));
  month = Number(this.today.slice(5, 7)) - 1;
  selectedDay = Number(this.today.slice(-2));
  closing = monthlyClosing([], this.year, this.month);
  readonly weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  private currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  ngOnChanges(): void { this.refresh(); }
  get monthLabel(): string { return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(this.year, this.month, 1))); }
  get blanks(): number[] { return Array.from({ length: this.closing.offset }, (_, index) => index); }
  get selected() { return this.closing.days[this.selectedDay - 1]; }
  get selectedLabel(): string { return `${String(this.selectedDay).padStart(2, '0')}/${String(this.month + 1).padStart(2, '0')}/${this.year}`; }
  money(value: number): string { return this.currency.format(value / 100); }
  isToday(key: string): boolean { return key === this.today; }
  changeMonth(delta: number): void {
    const date = new Date(Date.UTC(this.year, this.month + delta, 1));
    this.year = date.getUTCFullYear(); this.month = date.getUTCMonth(); this.selectedDay = 1; this.refresh();
  }
  currentMonth(): void {
    this.year = Number(this.today.slice(0, 4)); this.month = Number(this.today.slice(5, 7)) - 1; this.selectedDay = Number(this.today.slice(-2)); this.refresh();
  }
  private refresh(): void { this.closing = monthlyClosing(this.deliveries, this.year, this.month); }
}
