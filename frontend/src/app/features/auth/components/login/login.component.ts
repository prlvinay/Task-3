import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthserviceService } from '../../services/authservice.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  forgotPasswordForm!: FormGroup;
  isForgotPasswordModalOpen = false;

  constructor(
    private authService: AuthserviceService,
    private router: Router,
    private toastr: ToastrService
  ) {}
  ngOnInit(): void {
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(4),
      ]),
    });
    this.forgotPasswordForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
    });
  }
  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.authService.login(email, password).subscribe({
        next: (response) => {
          //alert(response.message);
          if (response) this.authService.setToken(response.access_token);
          this.authService.setRefreshToken(response.refresh_token);
          this.toastr.success('Logged in successfully!', 'Success');
          console.log('Login success');
          this.loginForm.reset();
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          console.error('Login failed', error);
        },
      });
    } else {
      console.log('Form Invalid');
    }
  }

  openForgotPasswordModal() {
    this.isForgotPasswordModalOpen = true;
  }

  closeForgotPasswordModal() {
    this.isForgotPasswordModalOpen = false;
  }

  onForgotPasswordSubmit() {
    if (this.forgotPasswordForm.valid) {
      const { email } = this.forgotPasswordForm.value;
      this.authService.forgotPassword(email).subscribe({
        next: (response) => {
          this.toastr.success('Reset link sent to your email!', 'Success');
          this.closeForgotPasswordModal();
        },
        error: (error) => {
          this.toastr.error('Failed to send reset link.', 'Error');
        },
      });
    }
  }
}
