import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';

@Component({standalone:true,imports:[CommonModule,ReactiveFormsModule],template:`
<main class="center"><section class="login card"><div class="wolf">🐺</div><h1>BLACKOUT <span>DELIVERY</span></h1><p class="muted">Acesso da loja e dos entregadores</p>
<form [formGroup]="form" (ngSubmit)="submit()">
<div class="login-field"><label for="login-email">E-mail</label><input id="login-email" type="email" formControlName="email" placeholder="email@blackout.local" autocomplete="username"></div>
<div class="login-field"><label for="login-password">Senha</label><input id="login-password" type="password" formControlName="password" placeholder="Sua senha" autocomplete="current-password"></div>
<button class="btn" type="submit" [disabled]="form.invalid || loading">{{loading?'Entrando...':'Entrar'}}</button>
</form><p *ngIf="error" style="color:#ff6868;margin-top:12px">{{error}}</p>
<div class="demo">Use o acesso fornecido pela loja.</div></section></main>`,styles:[`
 :host{display:block}
 .center{min-height:100dvh}
 .login{padding:clamp(24px,6vw,42px)}
 .login h1{font-size:clamp(22px,5vw,28px);line-height:1.2;overflow-wrap:break-word}
 form{display:grid;gap:18px;margin-top:28px;text-align:left}
 .login-field{display:grid;gap:8px;min-width:0}
 label{font-size:14px;font-weight:600;color:#e4e4e7}
 input{display:block;width:100%;min-width:0;min-height:48px;padding:12px 14px;border:1px solid #52525b;border-radius:10px;background:#09090b;color:#fafafa;font:inherit}
 input::placeholder{color:#8b8b96}
 input:focus-visible{outline:2px solid #ff5147;outline-offset:2px}
 .login .btn{margin-top:4px;min-height:48px}
 .demo{line-height:1.5}
` ]})
export class LoginComponent{
 form=this.fb.group({email:['',[Validators.required,Validators.email]],password:['',[Validators.required,Validators.minLength(6)]]}); loading=false; error='';
 constructor(private fb:FormBuilder,private auth:AuthService){}
 async submit(){ if(this.form.invalid)return; this.loading=true;this.error=''; try{const {email,password}=this.form.getRawValue();await this.auth.login(email!,password!);}catch(e:any){this.error=this.message(e?.code,e?.message);}finally{this.loading=false;} }
 private message(code?:string,msg?:string){ if(code==='auth/invalid-credential')return 'E-mail ou senha inválidos.'; if(code==='auth/too-many-requests')return 'Muitas tentativas. Tente novamente mais tarde.'; return msg || 'Não foi possível entrar.'; }
}
