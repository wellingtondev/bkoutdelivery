import { Routes } from '@angular/router';
import { driverGuard, storeGuard } from './core/auth.guards';
export const routes:Routes=[
 {path:'',redirectTo:'login',pathMatch:'full'},
 {path:'login',loadComponent:()=>import('./pages/login/login.component').then(m=>m.LoginComponent)},
 {path:'loja',canActivate:[storeGuard],loadComponent:()=>import('./pages/store/store.component').then(m=>m.StoreComponent)},
 {path:'entregador',canActivate:[driverGuard],loadComponent:()=>import('./pages/driver/driver.component').then(m=>m.DriverComponent)},
 {path:'track/:token',loadComponent:()=>import('./pages/tracking/tracking.component').then(m=>m.TrackingComponent)},
 {path:'**',redirectTo:'login'}];
