import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthserviceService } from '../services/authservice.service';

@Injectable({
  providedIn: 'root'
})
export class Auth1Guard implements CanActivate {
  constructor(private router:Router,private auth :AuthserviceService){}
  canActivate(): boolean {
    const token=this.auth.getToken();
    if(token){
      return true;//prevent this route;
    }
    this.router.navigate(['/auth/login']);
    return false;
  }
  
}
