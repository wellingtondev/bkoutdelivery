import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export type UserRole = 'STORE' | 'DRIVER';
export interface AppUser { uid:string; name:string; email:string; role:UserRole; phone?:string; active?:boolean; }

@Injectable({providedIn:'root'})
export class AuthService {
  private currentUser: User | null = null;
  private profile: AppUser | null = null;
  private initialized = false;
  private initPromise: Promise<void>;

  constructor(private router:Router) {
    this.initPromise = new Promise(resolve => {
      onAuthStateChanged(auth, async user => {
        this.currentUser = user;
        this.profile = user ? await this.loadProfile(user.uid) : null;
        this.initialized = true;
        resolve();
      });
    });
  }

  private async loadProfile(uid:string):Promise<AppUser|null> {
    const snap = await getDoc(doc(db,'users',uid));
    return snap.exists() ? ({uid, ...snap.data()} as AppUser) : null;
  }

  async ready(){ if(!this.initialized) await this.initPromise; }
  get user(){ return this.currentUser; }
  get userProfile(){ return this.profile; }
  get role(){ return this.profile?.role ?? null; }

  async login(email:string,password:string){
    const credential = await signInWithEmailAndPassword(auth,email,password);
    this.currentUser = credential.user;
    this.profile = await this.loadProfile(credential.user.uid);
    if(!this.profile || this.profile.active === false){ await signOut(auth); throw new Error('Usuário sem perfil ativo no Firestore.'); }
    await this.router.navigateByUrl(this.profile.role === 'STORE' ? '/loja' : '/entregador');
  }

  async logout(){ await signOut(auth); this.profile=null; await this.router.navigateByUrl('/login'); }
}
