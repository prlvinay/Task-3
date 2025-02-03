import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MainpageService } from '../../services/mainpage.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AwsService } from '../../services/aws.service';
import { ChatService } from 'src/app/core/services/chat.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit {
  user: any = {};
  selectedFile: File | null = null;
  fileUrl: string = '';
  constructor(
    private main: MainpageService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private toastr: ToastrService,
    private aws: AwsService,
    private chat: ChatService
  ) {}

  ngOnInit(): void {
    this.getUserInfo();
  }
  getUserInfo(): void {
    this.main.getUserInfo().subscribe({
      next: (data) => {
        this.user = data;
        this.main.setName(this.user.username);
      },
      error: (error) => {
        console.error('Error fetching user data:', error);
      },
    });
  }

  handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      console.log('File selected:', this.selectedFile);
    }
  }

  onUpload(): void {
    if (this.selectedFile) {
      const fileName = this.selectedFile.name;
      const fileType = this.selectedFile.type;
      console.log('befors pre', this.user.user_id);
      this.aws
        .getPresignedUrl(
          fileName,
          fileType,
          this.user.user_id,
          'profile-photos'
        )
        .subscribe({
          next: (response) => {
            const { presignedUrl, fileName, userId } = response;
            this.uploadToS3(presignedUrl, fileName, userId);
          },
          error: (error) => {
            console.error('Error getting presigned URL:', error);
          },
        });
    }
  }

  uploadToS3(presignedUrl: string, fileName: string, userId: string): void {
    if (this.selectedFile) {
      this.aws.uploadFileToS3(presignedUrl, this.selectedFile).subscribe({
        next: () => {
          this.toastr.success('File successfully uploaded to S3', 'Success');
          console.log('File successfully uploaded to S3');
          this.aws
            .updateProfilePic(this.user.user_id, fileName, presignedUrl)
            .subscribe({
              next: (response) => {
                this.toastr.success(response.message, 'Success');
                console.log(response.message);
                this.user.profilePic = response.fileUrl;
                this.router
                  .navigateByUrl('/dashboard', { skipLocationChange: true })
                  .then(() => {
                    this.router.navigate([decodeURIComponent(this.router.url)]);
                  });
              },
              error: (error) => {
                console.error('Error updating profile picture:', error);
              },
            });
        },
        error: (error) => {
          console.error('Error uploading file:', error);
        },
      });
    }
  }

  onLogout() {
    sessionStorage.clear();
    this.router.navigate(['/auth/login']);
  }
}
