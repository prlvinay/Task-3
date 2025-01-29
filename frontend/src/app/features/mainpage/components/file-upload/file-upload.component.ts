import { Component, OnInit } from '@angular/core';
import { MainpageService } from '../../services/mainpage.service';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { AwsService } from '../../services/aws.service';
import * as JSZip from 'jszip';
import { ToastrService } from 'ngx-toastr';
import { saveAs } from 'file-saver';
import { ChatService } from 'src/app/core/services/chat.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css'],
})
export class FileUploadComponent implements OnInit {
  selectedFile: File | null = null;
  uploadedFiles: { name: string; url: string; selected: boolean }[] = [];
  fileUrl: string = '';
  user: any = {};
  files: any[] = [];

  messages: any[] = [];
  newMessage: string = '';
  showChatWindow = false;
  username: string = '';
  roomName: string = '';
  roomJoined: boolean = false;

  constructor(
    private main: MainpageService,
    private router: Router,
    private aws: AwsService,
    private toastr: ToastrService,
    private chatService: ChatService
  ) {}

  ngOnInit(): void {
    //this.getUserInfo();
    this.loadFiles();
    this.getUserInfo();

    this.chatService.userConnected(this.username);

    // sub  messages
    this.chatService.messages$.subscribe((messages) => {
      this.messages = messages;
    });

    this.chatService.userList$.subscribe((userList) => {
      console.log('Active users: ', userList);
    });
  }
  getUserInfo(): void {
    this.main.getUserInfo().subscribe({
      next: (data) => {
        this.user = data;
        this.username = this.user.username;
      },
      error: (error) => {
        console.error('Error fetching user data:', error);
      },
    });
  }

  toggleChatWindow() {
    this.showChatWindow = !this.showChatWindow;
  }

  sendMessage() {
    if (this.newMessage.trim()) {
      const messageData = {
        user: this.username,
        message: this.newMessage,
        room: this.roomName,
        timestamp: new Date(),
      };
      this.chatService.sendMessage(messageData);
      this.newMessage = '';
    }
  }
  createRoom() {
    if (this.roomName.trim()) {
      this.roomJoined = true;
      this.chatService.createRoom(this.roomName);
    }
  }
  joinRoom() {
    if (this.roomName.trim()) {
      this.roomJoined = true;
      this.chatService.joinRoom(this.roomName);
    }
  }
  exitRoom() {
    if (this.roomName.trim()) {
      this.roomJoined = false;
      this.chatService.leaveRoom(this.roomName);
      this.roomName = '';
    }
  }

  loadFiles() {
    this.main.getFiles().subscribe({
      next: (data) => {
        this.files = data;
        this.files.shift();
        this.files.forEach((file) => {
          file.selected = false;
          //file.fileType = this.getFileType(file.name);
        });
      },
      error: (error) => {
        console.error('Error in fetching files from AWS', error);
      },
    });
  }

  getFileIcon(fileType: string): string {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return 'bi-file-pdf text-danger';
      case 'jpg':
      case 'png':
      case 'jpeg':
        return 'bi-file-image text-primary';
      case 'mp4':
        return 'bi-file-play text-success';
      case 'docx':
        return 'bi-file-word text-info';
      default:
        return 'bi-file-earmark text-warning';
    }
  }

  toggleFileSelection(file: { selected: boolean }, event: any) {
    const checked = event.target.checked;
    file.selected = checked;
    //console.log(this.files);
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
      console.log('before url', this.user.user_id);
      this.aws.getPresignedUrl(fileName, fileType, 'files').subscribe({
        next: (response) => {
          const { presignedUrl, fileName, userId } = response;
          console.log('response', response);
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
        next: (res: any) => {
          this.toastr.success('File successfully uploaded to S3', 'success');
          this.loadFiles();
        },
        error: (error) => {
          console.error('Error uploading file:', error);
        },
      });
    }
  }
  downloadAllSelected(): void {
    const selectedFiles = this.files.filter((file) => file.selected);
    console.log(selectedFiles);
    if (selectedFiles.length === 0) {
      alert('Please select files to download.');
      return;
    }

    //  downloading directly
    if (selectedFiles.length === 1) {
      const fileName = selectedFiles[0].fileName;
      const fileUrl = `${environment.fileUrl}/${fileName}`;
      const fileExtension = fileName.split('.').pop();
      const fullFileName = fileExtension ? fileName : `${fileName}.txt`;

      fetch(fileUrl)
        .then((response) => response.blob())
        .then((blob) => {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = fullFileName;
          link.click();
        })
        .catch((error) => {
          console.error('Error downloading the file:', error);
        });
    } else {
      // as a ZIP
      const zip = new JSZip();
      const promises = selectedFiles.map((file, index) => {
        const fileName = file.fileName;
        const fileUrl = `${environment.fileUrl}/${fileName}`;
        const fileExtension = fileName.split('.').pop();
        const fullFileName = fileExtension ? fileName : `${fileName}.txt`;

        return fetch(fileUrl)
          .then((response) => response.blob())
          .then((blob) => {
            zip.file(fullFileName, blob);
          })
          .catch((error) => {
            console.error('Error downloading file:', error);
          });
      });

      Promise.all(promises)
        .then(() => {
          zip.generateAsync({ type: 'blob' }).then((content) => {
            saveAs(content, `downloaded_files_${Date.now()}.zip`);
          });
        })
        .catch((error) => {
          console.error('Error creating the ZIP file:', error);
        });
    }
  }
  imageUrl = '';
  showImage(file: any) {
    this.imageUrl = `https://akv-interns.s3.ap-south-1.amazonaws.com/vinay@AKV0793/fileuploads/${file.fileName}`;
  }
  isImage(url: string) {
    return this.main.isImage(url);
  }
}
