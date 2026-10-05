import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Delivery } from '../../models/models';
import { driverSettlement, settlementWeek } from './driver-settlement';
@Component({selector:'app-driver-settlement',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./driver-settlement.component.html',styleUrl:'./driver-settlement.component.css'})
export class DriverSettlementComponent {
  @Input() deliveries:Delivery[]=[];
  @Input() driverNames:Record<string,string>={};
  @Input() loading=false;
  @Input() error='';
  start=settlementWeek().start;
  end=settlementWeek().end;
  get summary(){return driverSettlement(this.deliveries,this.start,this.end);}
  week(offset:number):void{const range=settlementWeek(new Date(),offset);this.start=range.start;this.end=range.end;}
  name(id:string|null):string{return id===null?'Sem entregador identificado':this.driverNames[id]?.trim()||`Entregador ${id}`;}
}
