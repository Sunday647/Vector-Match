/** Coordinates authored against mountain.jpg's painted road, from bottom to top. */
export const ROUTE_STEP=180;
export const ROUTE_TILE_HEIGHT=1440;
export const ROUTE_TILE_CENTER=630;
const ROAD_X=[18,40,-115,-191,-72,144,169,29];
export function routeX(index:number):number{return ROAD_X[((Math.floor(index)%8)+8)%8];}
export function routeLimit(completed:number):number{return Math.floor(Number.MAX_SAFE_INTEGER/ROUTE_STEP);}
export function clampRoute(offset:number,completed:number):number{return Math.max(0,Math.min((routeLimit(completed)-1)*ROUTE_STEP,offset));}
export function visibleRoute(offset:number,height:number,completed:number):number[]{
 const first=Math.max(0,Math.floor((offset-height/2)/ROUTE_STEP)-1);
 const last=Math.min(routeLimit(completed)-1,Math.ceil((offset+height/2)/ROUTE_STEP)+1);
 return Array.from({length:Math.max(0,last-first+1)},(_,i)=>first+i);
}
