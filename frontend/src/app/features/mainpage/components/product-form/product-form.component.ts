import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { MainpageService } from '../../services/mainpage.service';
import { ToastrService } from 'ngx-toastr';
import { AwsService } from '../../services/aws.service';
@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.css'],
})
export class ProductFormComponent implements OnInit {
  selectedVendors: number[] = [];
  productForm: FormGroup;
  selectedFile: File | null = null;
  item: any;
  @Output() formSubmitted = new EventEmitter<any>();
  @Output() imagechange = new EventEmitter<any>();
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private main: MainpageService,
    private toastr: ToastrService,
    private aws: AwsService
  ) {
    this.main.dataSource.subscribe((data) => {
      console.log('subject', data);
      this.item = data;
      console.log(this.item);
      if (this.item) {
        this.populateFormForEdit();
      }
    });

    this.productForm = this.fb.group({
      productName: ['', Validators.required],
      category: ['', Validators.required],
      vendor: ['', Validators.required], //[]
      quantity: ['', [Validators.required, Validators.min(1)]],
      unit: ['', Validators.required],
      status: ['', Validators.required],
      productImage: [''],
    });
  }
  vendors: any;
  categories: any;
  ngOnInit(): void {
    this.http.get(`${environment.Url}/dashboard/vendor`).subscribe((data) => {
      this.vendors = data;
      //console.log('hi' + data);
    });
    this.http
      .get(`${environment.Url}/dashboard/categories`)
      .subscribe((data) => {
        this.categories = data;
        //console.log(data);
      });
  }

  onVendorChange(event: any) {
    const vendorId = event.target.value;
    if (event.target.checked) {
      this.selectedVendors.push(vendorId);
    } else {
      this.selectedVendors = this.selectedVendors.filter(
        (id) => id !== vendorId
      );
    }
    this.productForm.get('vendor')?.setValue(this.selectedVendors);
  }

  isSelected(vendorId: number): boolean {
    return this.selectedVendors.includes(vendorId);
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      console.log('Image selected:', this.selectedFile);
    }
  }

  form: any;
  onSubmit() {
    if (this.productForm.valid) {
      if (this.item) {
        this.form = this.productForm.value;
        this.form.product_id = this.item.product_id;
        this.main.editproduct(this.form).subscribe();
      } else {
        console.log('form data' + JSON.stringify(this.productForm.value));
        this.formSubmitted.emit(this.productForm.value);
        console.log(this.productForm.value);
      }
    }
  }

  onUpload() {
    if (this.selectedFile) {
      const fileName = this.selectedFile.name;
      const fileType = this.selectedFile.type;
      this.aws.getPresignedUrl(fileName, fileType, 'pics').subscribe({
        next: (response: any) => {
          const { presignedUrl, fileName, userId } = response;
          console.log('res img', response.imageUrl);

          this.uploadToS3(presignedUrl, fileName, userId, response.imageUrl);
        },
        error: (error: any) => {
          console.error('Error getting presigned URL:', error);
        },
      });
    }
  }

  uploadToS3(
    presignedUrl: string,
    fileName: string,
    userId: string,
    image: string
  ): void {
    if (this.selectedFile) {
      this.aws.uploadFileToS3(presignedUrl, this.selectedFile).subscribe({
        next: () => {
          this.toastr.success('Photo successfully uploaded to S3', 'Success');
          this.http
            .put(`${environment.Url}/dashboard/product/updateimage`, {
              id: this.item?.product_id,
              image: image,
            })
            .subscribe((data: any) => {
              console.log(data.message);
              this.imagechange.emit(this.productForm.value);
            });
        },
        error: (error) => {
          console.error('Error uploading file:', error);
        },
      });
    }
  }

  populateFormForEdit() {
    this.productForm.patchValue({
      productName: this.item.product_name,
      quantity: this.item.quantity_in_stock,
      unit: this.item.unit_price,
      status: this.item.status,
    });
  }
}
