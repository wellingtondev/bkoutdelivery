import { loadGoogleMaps, withAbort } from './google-maps';
import type { AddressPoint } from './address-search';

export interface AddressSuggestion { id:string; label:string; prediction:any; }

/** One Places billing session per edit/select cycle. Only coordinates enter the delivery. */
export class AddressAutocomplete {
  private token:any;
  private generation=0;
  reset():void { this.token=undefined;this.generation++; }
  async suggest(query:string, signal:AbortSignal):Promise<AddressSuggestion[]> {
    if(signal.aborted)throw new DOMException('Busca cancelada','AbortError');
    if(query.trim().length<3)return [];
    const generation=this.generation;
    const maps=await withAbort(loadGoogleMaps(),signal);
    const {AutocompleteSuggestion,AutocompleteSessionToken}=await withAbort(maps.importLibrary('places'),signal) as any;
    if(generation!==this.generation)throw new DOMException('Busca cancelada','AbortError');
    this.token??=new AutocompleteSessionToken();
    const response:any=await withAbort(AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input:query.trim(),sessionToken:this.token,language:'pt-BR',region:'br',includedRegionCodes:['br'],
      locationRestriction:{south:-19.90,north:-19.60,west:-48.12,east:-47.75}
    }),signal);
    return (response.suggestions??[]).filter((s:any)=>s.placePrediction).slice(0,5).map((s:any)=>({
      id:s.placePrediction.placeId,label:s.placePrediction.text.toString(),prediction:s.placePrediction
    }));
  }
  async select(suggestion:AddressSuggestion,signal:AbortSignal):Promise<AddressPoint> {
    if(signal.aborted)throw new DOMException('Busca cancelada','AbortError');
    const place=suggestion.prediction.toPlace();
    this.reset(); // Details terminates the prediction session; later edits start another.
    await withAbort(place.fetchFields({fields:['location','formattedAddress','addressComponents']}),signal);
    const component=(type:string)=>place.addressComponents?.find((c:any)=>c.types?.includes(type));
    const city=component('locality')?.longText??component('administrative_area_level_2')?.longText;
    if(city?.toLocaleLowerCase('pt-BR')!=='uberaba'||component('administrative_area_level_1')?.shortText!=='MG'||component('country')?.shortText!=='BR') {
      throw new Error('Selecione um endereço em Uberaba/MG.');
    }
    const lat=place.location?.lat(),lng=place.location?.lng();
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw new Error('O Google não retornou a localização. Marque a entrada no mapa.');
    if(!component('street_number'))throw new Error('O Google localizou a rua, mas não confirmou o número. Informe o número ou marque a entrada no mapa.');
    return {lat,lng,label:place.formattedAddress||suggestion.label};
  }
}

export function addressSearchError(error:unknown):string {
  const raw=String((error as any)?.code??(error as any)?.status??(error as any)?.message??'');
  if(/REQUEST_DENIED|PERMISSION_DENIED|ApiNotActivated|API_KEY|not authorized|not enabled|referer|billing/i.test(raw))return 'O Google bloqueou a busca. Ative Places API (New), confira o faturamento e autorize esta chave e o domínio nas restrições do Google Cloud.';
  if(/OVER_QUERY_LIMIT|RESOURCE_EXHAUSTED|quota/i.test(raw))return 'O limite de consultas do Google foi atingido. Confira as cotas no Google Cloud ou tente novamente mais tarde.';
  if((error as any)?.name==='AbortError')return 'A busca demorou demais. Tente novamente ou marque a entrada no mapa.';
  if(/Selecione um endereço|O Google (não retornou|localizou)/.test(raw))return raw;
  return 'Não foi possível consultar o Google Places. Verifique a conexão, a ativação da Places API (New) e as restrições da chave. Você pode marcar a entrada no mapa.';
}
