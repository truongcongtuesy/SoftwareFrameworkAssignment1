import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="form-container">
      <h2 class="text-center mb-3">Login to Chat System</h2>
      
      <div *ngIf="error" class="alert alert-danger">
        {{ error }}
      </div>

      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label for="username">Username</label>
          <input 
            type="text" 
            id="username"
            class="form-control" 
            formControlName="username"
            placeholder="Enter your username"
          >
          <div *ngIf="loginForm.get('username')?.invalid && loginForm.get('username')?.touched" class="text-danger">
            Username is required
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
          <div *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched" class="text-danger">
            Password is required
          </div>
        </div>

        <button 
          type="submit" 
          class="btn btn-primary" 
          style="width: 100%"
          [disabled]="loginForm.invalid || loading"
        >
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>

      <div class="text-center mt-3">
        <p>Don't have an account? <a routerLink="/register">Register here</a></p>
      </div>

      <div class="text-center mt-3">
        <small class="text-muted">
          Default super admin: username "super", password "123"
        </small>
      </div>
    </div>
  `,
  styles: [`
    .text-danger {
      color: #dc3545;
      font-size: 14px;
      margin-top: 5px;
    }
    .text-muted {
      color: #6c757d;
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
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.error = response.message || 'Login failed';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.error || 'Login failed. Please try again.';
      }
    });
  }
}
