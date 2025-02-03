import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import * as xlsx from 'xlsx';
import { jsPDF } from 'jspdf';
import { MainpageService } from '../../services/mainpage.service';
import { ToastrService } from 'ngx-toastr';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { AwsService } from '../../services/aws.service';
@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.css'],
})
export class InventoryComponent implements OnInit {
  filterData: any = {
    product_name: '',
    category_name: '',
    status: '',
  };
  filters = {
    vendorName: '',
    productName: '',
    categoryName: '',
    quantityInStock: '',
    unitPrice: '',
    status: '',
  };
  products: any[] = [];
  productData: any;
  searchTerm1: string = '';
  pageNo = 1;
  limit = 10;
  size: number = 0;
  todownload: any[] = [];
  selectedItems: any[] = [];
  totalPage = 1;
  totalcount = 0;
  categories: any;
  showCart: boolean = false;
  searchTerm: string = '';
  importedFiles: any[] = [];

  valid: boolean = false;
  selectedFile: File | null = null;
  productToDelete: number | null = null;
  cart: any;
  userid: number = 1;
  user: any;

  constructor(
    private http: HttpClient,
    private main: MainpageService,
    private toastr: ToastrService,
    private aws: AwsService
  ) {}
  subject: Subject<string> = new Subject<string>();
  ngOnInit(): void {
    this.fetchData();
    this.http
      .get(`${environment.Url}/dashboard/categories`)
      .subscribe((data) => {
        this.categories = data;
        //console.log('hello', this.categories?.data);
      });
    this.main.getUserInfo().subscribe({
      next: (data) => {
        this.user = data;
        this.userid = data.user_id;
      },
      error: (error) => {
        console.error('Error fetching user data:', error);
      },
    });
    this.getFiles();
    this.subject
      .pipe(
        debounceTime(600),
        distinctUntilChanged(),
        switchMap((searchTerm1) =>
          this.main.getProducts(
            this.pageNo,
            this.limit,
            searchTerm1,
            this.filters
          )
        )
      )
      .subscribe((response) => {
        this.products = response.data;
        this.totalcount = response.pagination.totalCount;
        this.totalPage = response.pagination.totalPages;
      });
    this.fetchNotifications();
  }
  onSearchChange(event: any): void {
    this.searchTerm1 = event?.target?.value;
    this.subject.next(event?.target?.value);
  }
  onFilterChange(): void {
    this.subject.next(this.searchTerm1);
  }
  onPageChange(page: number): void {
    this.pageNo = page;
    this.subject.next(this.searchTerm1);
  }

  onCart() {
    console.log('now show cart');
    this.showCart = true;
    this.main.fetchCartDataForUser(this.userid).subscribe((data: any) => {
      this.cart = data.data;
      this.size = this.cart.length;
      console.log(data);
    });
  }
  onView() {
    console.log('now show view');
    this.showCart = false;
  }

  cartchange(item: any, event: any): void {
    let valid = event.target.checked;
    if (valid) {
      console.log(item);
      this.main.addcart(item);
      this.todownload.push(item);
      console.log('for downloading', this.todownload);
    }
  }

  fetchData() {
    this.main
      .getProducts(this.pageNo, this.limit, this.searchTerm1, this.filters)
      .subscribe({
        next: (res: any) => {
          //console.log('response', res.data);
          this.products = res.data;
          this.totalPage = res.pagination.totalPages;
          this.totalcount = res.pagination.totalCount;
          console.log(res);
        },
        error: (err) => {
          console.log('getting error while featching the records', err);
        },
      });
  }

  searchCategory() {
    this.fetchData();
  }

  fetchNotifications() {
    this.main.getUnreadNotifications().subscribe((notifications) => {
      notifications.forEach((notification: any) => {
        this.toastr.info(notification.message, 'Notification');
      });

      // **Mark notifications as read after displaying them**
      this.main.markNotificationsAsRead().subscribe();
    });
  }
  onChange(event: any) {
    const searchText = event.target?.value;
    this.subject.next(searchText);
  }
  showModal = false;

  openDeleteModal(productId: number) {
    this.productToDelete = productId;
  }

  onproduct() {
    this.valid = true;
  }

  confirmDelete() {
    if (this.productToDelete !== null) {
      this.http
        .delete(`${environment.Url}/dashboard/product/${this.productToDelete}`)
        .subscribe(
          (response) => {
            this.toastr.success('Product deleted successfully', 'success');
            this.productToDelete = null;
            this.fetchData();
          },
          (error) => {
            console.error('Error soft deleting product:', error);
          }
        );
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput?.click();
  }

  onUpload(): void {
    if (this.selectedFile) {
      console.log('Uploading file:', this.selectedFile.name);
    }
  }

  downloadPDF(product: any) {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Product Details', 20, 20);
    doc.setFontSize(12);
    doc.text(`Product Name: ${product.product_name}`, 20, 30);
    doc.text(`Category: ${product.category_name}`, 20, 40);
    doc.text(
      `Status: ${product.status === '1' ? 'Available' : 'Sold Out'}`,
      20,
      50
    );
    doc.text(`Quantity: ${product.quantity_in_stock}`, 20, 60);
    doc.text(`Unit: ${product.unit_price}`, 20, 70);
    doc.text(`Vendors: ${product.vendor_name}`, 20, 80);
    doc.save(`${product.product_name}_details.pdf`);
  }

  showMoveToCartModal: boolean = false;
  handleform(productData: any) {
    console.log('Product Data:', productData);
    this.http
      .post(`${environment.Url}/dashboard/product`, productData)
      .subscribe({
        next: (data) => {
          this.toastr.success('New Product Added Successfully', 'Success');
          this.fetchData();
          console.log('new product added' + data);
        },
        error: (error) => {
          console.error('Error adding product:', error);
        },
      });
    if (productData.status === 'Available') productData.status = 1;
    else productData.status = 0;
  }

  download() {
    if (this.todownload.length == 0) {
      this.toastr.error('Pleas Select any Product to downloaded', 'error');
    } else if (this.todownload) {
      console.log('download', this.todownload);
      const ws = xlsx.utils.json_to_sheet(this.todownload);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'place');
      xlsx.writeFile(wb, 'YourInventory.xlsx');
    }
  }
  onproductedit(item: any) {
    this.main.setdata(item);
  }
  editform(edit: any) {
    console.log('dash', edit);
    this.main.editproduct(edit).subscribe({
      next: (data) => {
        this.toastr.success('Product edited Successfully', 'success');
        this.fetchData();
      },
      error: () => {
        this.toastr.error('Unable to Edit the product Retry Later', 'error');
      },
    });
  }
  image(img: any) {
    this.fetchData();
  }

  getPageNumbers(): (number | string)[] {
    const pageNumbers: (number | string)[] = [];
    const currentPage = this.pageNo;
    const totalPages = this.totalPage;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, currentPage + 2);
    if (start > 1) {
      pageNumbers.push(1);
      if (start > 2) pageNumbers.push('...');
    }
    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }
    if (end < totalPages) {
      if (end < totalPages - 1) pageNumbers.push('...');
      pageNumbers.push(totalPages);
    }
    return pageNumbers;
  }
  navigateToPage(page: number | string): void {
    if (page === '...') return;
    const parsedPage = typeof page === 'string' ? parseInt(page, 10) : page;
    if (parsedPage >= 1 && parsedPage <= this.totalPage) {
      this.pageNo = parsedPage;
      console.log(page);
      this.fetchData();
    }
  }
  data: any;
  onimport(event: any): void {
    const file = event.target.files[0];
    if (!file) {
      alert('No file selected.');
      return;
    }
    const fileType = file.name.split('.').pop();
    if (fileType !== 'xlsx' && fileType !== 'xls') {
      alert('Invalid file type. Please upload an Excel file.');
      return;
    }
    const reader = new FileReader();
    console.log(reader);
    reader.onload = (e: any) => {
      console.log('Reader onload called!');
      const data = new Uint8Array(e.target.result);
      const workbook = xlsx.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      this.data = xlsx.utils.sheet_to_json(worksheet);
      console.log('data is ', this.data);
      this.adddata();
    };
    reader.readAsArrayBuffer(file);
  }
  onimport1(event: any): void {
    const files = event.target.files;
    console.log(files);
    if (!files) {
      alert('Select any file.');
      return;
    }
    for (let file of files) {
      console.log('File ', file);
      let fileName = file.name;
      let filearr = fileName.split('.');
      let fileType = filearr.pop();
      console.log('fileType', fileType);
      if (fileType == 'xls' || fileType == 'xlsx') {
        console.log('before url', this.user.user_id);
        this.aws
          .getPresignedUrl(
            fileName,
            fileType,
            this.user.user_id,
            'importedfiles'
          )
          .subscribe({
            next: (response) => {
              const { presignedUrl, fileName, userId } = response;
              console.log('response', response);
              this.uploadToS3(presignedUrl, file);
            },
            error: (error) => {
              console.error('Error getting presigned URL:', error);
            },
          });
      } else {
        console.log('Not an Excel file');
        this.toastr.error('File Type Not Supported to upload');
      }
    }
  }
  uploadToS3(presignedUrl: string, file: File): void {
    this.aws.uploadFileToS3(presignedUrl, file).subscribe({
      next: (res: any) => {
        this.toastr.success('File successfully uploaded to S3', 'success');
        const addfiles = {
          user_id: this.user.user_id,
          filename: file.name,
        };
        this.http
          .post(`${environment.Url}/import/add`, addfiles)
          .subscribe((data) => {
            console.log('uploaded successfully in table');
            this.getFiles();
          });
      },
      error: (error) => {
        console.error('Error uploading file:', error);
      },
    });
  }

  handleReload(event: any) {
    this.fetchData();
  }

  adddata() {
    if (this.data) {
      console.log('loop');
      for (let items of this.data) {
        console.log(items);
        this.main.addproducts(items);
      }
      this.toastr.success('successfully updated', 'Success');
    }
  }
  deleteProduct(card_id: number): void {
    const payload = { id: card_id };
    console.log(payload);
    this.http.delete(`${environment.Url}/cart/delete/${card_id}`).subscribe({
      next: (response: any) => {
        this.cart = this.cart.filter((item: any) => item.card_id !== card_id);
        this.toastr.success('Product removed from cart');
        this.fetchData();
      },
      error: (err) => {
        this.toastr.error('Error removing product from cart');
        console.error(err);
      },
    });
  }

  getFiles() {
    this.main.getImports(this.userid).subscribe({
      next: (res: any) => {
        console.log(res);
        this.importedFiles = res.files;
        //console.log('Imported Files', this.importedFiles);
      },
      error: () => {},
    });
  }
}
