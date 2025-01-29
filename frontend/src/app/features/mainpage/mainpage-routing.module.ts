import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { Auth1Guard } from '../auth/guards/auth1.guard';

const routes: Routes = [
  { path: '', component: DashboardComponent ,canActivate:[Auth1Guard]}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MainpageRoutingModule { }

