import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="form-container">
      <h2 class="text-center mb-3">Register for Chat System</h2>
      
      <div *ngIf="error" class="alert alert-danger">
        {{ error }}
      </div>

      <div *ngIf="success" class="alert alert-success">
        {{ success }}
      </div>

      <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label for="username">Username</label>
          <input 
            type="text" 
            id="username"
            class="form-control" 
            formControlName="username"
            placeholder="Enter your username"
          >
          <div *ngIf="registerForm.get('username')?.invalid && registerForm.get('username')?.touched" class="text-danger">
            <span *ngIf="registerForm.get('username')?.errors?.['required']">Username is required</span>
            <span *ngIf="registerForm.get('username')?.errors?.['minlength']">Username must be at least 3 characters</span>
          </div>
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input 
            type="email" 
            id="email"
            class="form-control" 
            formControlName="email"
            placeholder="Enter your email"
          >
          <div *ngIf="registerForm.get('email')?.invalid && registerForm.get('email')?.touched" class="text-danger">
            <span *ngIf="registerForm.get('email')?.errors?.['required']">Email is required</span>
            <span *ngIf="registerForm.get('email')?.errors?.['email']">Please enter a valid email</span>
          </div>
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input 
            type="password" 
            id="password"
            class="form-control" 
            formControlName="password"
            placeholder="Enter your password"
          >
          <div *ngIf="registerForm.get('password')?.invalid && registerForm.get('password')?.touched" class="text-danger">
            <span *ngIf="registerForm.get('password')?.errors?.['required']">Password is required</span>
            <span *ngIf="registerForm.get('password')?.errors?.['minlength']">Password must be at least 6 characters</span>
          </div>
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input 
            type="password" 
            id="confirmPassword"
            class="form-control" 
            formControlName="confirmPassword"
            placeholder="Confirm your password"
          >
          <div *ngIf="registerForm.get('confirmPassword')?.invalid && registerForm.get('confirmPassword')?.touched" class="text-danger">
            <span *ngIf="registerForm.get('confirmPassword')?.errors?.['required']">Please confirm your password</span>
          </div>
          <div *ngIf="registerForm.errors?.['passwordMismatch'] && registerForm.get('confirmPassword')?.touched" class="text-danger">
            Passwords do not match
          </div>
        </div>

        <button 
          type="submit" 
          class="btn btn-primary" 
          style="width: 100%"
          [disabled]="registerForm.invalid || loading"
        >
          {{ loading ? 'Creating Account...' : 'Register' }}
        </button>
      </form>

      <div class="text-center mt-3">
        <p>Already have an account? <a routerLink="/login">Login here</a></p>
      </div>
    </div>
  `,
  styles: [`
    .text-danger {
      color: #dc3545;
      font-size: 14px;
      margin-top: 5px;
    }
    a {
      color: #007bff;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  `]
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  error = '';
  success = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit() {
    if (this.registerForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const { confirmPassword, ...userData } = this.registerForm.value;

    this.authService.register(userData).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.success = 'Account created successfully! You can now login.';
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else {
          this.error = response.message || 'Registration failed';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.error || 'Registration failed. Please try again.';
      }
    });
  }
}
