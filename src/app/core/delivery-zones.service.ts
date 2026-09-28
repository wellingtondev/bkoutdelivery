import { Injectable, OnDestroy, signal } from '@angular/core';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { DeliveryZones, validateDeliveryZones } from './delivery-zones';

@Injectable({providedIn:'root'})
export class DeliveryZonesService implements OnDestroy {
  readonly config=signal<DeliveryZones|null>(null);
  readonly loading=signal(true);
  readonly error=signal('');
  private generation=0;
  private profileVersion=0;
  private storeUid:string|null=null;
  private stopProfile?:()=>void;
  private stopConfig?:()=>void;
  private stopAuth=onAuthStateChanged(auth,user=>{
    const generation=++this.generation;
    this.stopProfile?.();this.stopConfig?.();this.storeUid=null;
    this.config.set(null);this.error.set('');this.loading.set(!!user);
    if(!user)return;
    this.stopProfile=onSnapshot(doc(db,'users',user.uid),snapshot=>{
      if(generation!==this.generation)return;
      const version=++this.profileVersion;
      this.stopConfig?.();this.storeUid=null;this.config.set(null);this.error.set('');
      const profile=snapshot.data();
      if(profile?.['role']!=='STORE'||profile['active']===false){this.loading.set(false);return;}
      this.storeUid=user.uid;this.loading.set(true);
      this.stopConfig=onSnapshot(doc(db,'settings','deliveryZones'),data=>{
        if(generation!==this.generation||version!==this.profileVersion)return;
        this.loading.set(false);
        if(!data.exists()){this.config.set(null);this.error.set('');return;}
        const value=data.data(),reason=validateDeliveryZones(value);
        this.error.set(reason??'');this.config.set(reason?null:value as DeliveryZones);
      },()=>{if(generation===this.generation&&version===this.profileVersion){this.config.set(null);this.loading.set(false);this.error.set('Não foi possível carregar as zonas de entrega.');}});
    },()=>{if(generation===this.generation){++this.profileVersion;this.stopConfig?.();this.storeUid=null;this.config.set(null);this.loading.set(false);this.error.set('Não foi possível verificar o acesso às zonas.');}});
  });
  async save(zones:DeliveryZones):Promise<void>{
    if(!this.storeUid||auth.currentUser?.uid!==this.storeUid)throw new Error('Entre com uma conta ativa da loja para salvar as zonas.');
    const reason=validateDeliveryZones(zones);if(reason)throw new Error(reason);
    const generation=this.generation,version=this.profileVersion,uid=this.storeUid;
    const value:DeliveryZones={schemaVersion:1,green:zones.green.map(p=>({lat:p.lat,lng:p.lng})),yellow:zones.yellow.map(p=>({lat:p.lat,lng:p.lng}))};
    await setDoc(doc(db,'settings','deliveryZones'),value);
    if(generation===this.generation&&version===this.profileVersion&&uid===auth.currentUser?.uid){this.config.set(value);this.error.set('');this.loading.set(false);}
  }
  ngOnDestroy():void{++this.generation;this.stopAuth();this.stopProfile?.();this.stopConfig?.();}
}
