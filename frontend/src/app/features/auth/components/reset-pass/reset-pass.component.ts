import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthserviceService } from '../../services/authservice.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-reset-pass',
  templateUrl: './reset-pass.component.html',
  styleUrls: ['./reset-pass.component.css'],
})
export class ResetPassComponent implements OnInit {
  resetForm!: FormGroup;
  submitted = false;
  loading = false;
  token!: string | null;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private toastr: ToastrService,
    private route: ActivatedRoute,
    private authService: AuthserviceService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((val) => {
      this.token = val['token'];
      console.log(this.token);
    });

    this.resetForm = this.formBuilder.group(
      {
        password: ['', [Validators.required, Validators.minLength(4)]],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: this.passwordsMatch,
      }
    );
  }

  passwordsMatch(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { matching: true };
  }

  get f() {
    return this.resetForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.resetForm.invalid) {
      return;
    }
    console.log(this.resetForm.value);
    this.loading = true;
    const { password } = this.resetForm.value;
    this.authService.resetPassword(this.token, password).subscribe({
      next: () => {
        this.toastr.success('Password Reset Successfull. Please Login Now');
        this.router.navigate(['auth/login']);
      },
      error: (err) => {
        this.toastr.error('Error in reseting the password Try Again later');
        this.loading = false;
        console.error(err);
      },
    });
  }
}
