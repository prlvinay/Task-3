import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { AuthRoutingModule } from './auth-routing.module';
import { SignupComponent } from './components/signup/signup.component';
import { LoginComponent } from './components/login/login.component';
import { HttpInterceptorInterceptor } from './interceptors/http-interceptor.interceptor';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { ResetPassComponent } from './components/reset-pass/reset-pass.component';

@NgModule({
  declarations: [SignupComponent, LoginComponent, ResetPassComponent],
  imports: [CommonModule, ReactiveFormsModule, AuthRoutingModule],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpInterceptorInterceptor,
      multi: true,
    },
  ],
})
export class AuthModule {}
