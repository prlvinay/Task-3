import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable, Subject } from 'rxjs';
import { AuthserviceService } from '../../auth/services/authservice.service';
import { environment } from 'src/environments/environment';
import { ActivatedRoute, Router } from '@angular/router';
@Injectable({
  providedIn: 'root',
})
export class MainpageService {
  dataSource = new Subject<any>();
  cart = new Subject<any[]>();
  data: any;
  constructor(
    private http: HttpClient,
    private authSer: AuthserviceService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}
  getUserInfo(): Observable<any> {
    const token = this.authSer.getToken();
    return this.http.get<any>(`${environment.Url}/user/userdata`);
  }
  addcart(item: any) {
    this.cart.next(item);
  }

  getFiles(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.Url}/api/getfiles`);
  }

  editproduct(edit: any) {
    return this.http.put(`${environment.Url}/dashboard/products`, edit);
  }
  setName(name: string) {
    sessionStorage.setItem('username', name);
  }

  setdata(item: any) {
    this.dataSource.next(item);
    this.data = item;
  }
  fetchCartDataForUser(id: any) {
    return this.http.get(`${environment.Url}/cart/getdata/${id}`);
  }

  getProducts(
    page: number,
    limit: number,
    searchTerm: string,
    filters: { vendorName: string; productName: string; categoryName: string }
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('search', searchTerm)
      .set('filters', JSON.stringify(filters));

    return this.http
      .get<any>(`${environment.Url}/dashboard/filterProduct`, { params })
      .pipe(
        map((response) => {
          const transformedData = response.data.map((product: any) => {
            return {
              ...product,
              vendor_names: product.vendor_names
                ? product.vendor_names.split(',')
                : [],
            };
          });

          return {
            ...response,
            data: transformedData,
          };
        })
      );
  }

  filterProduct(filter: any, limit: any, pageno: any) {
    let params = new HttpParams()
      .set('product_name', filter.product_name || '')
      .set('category_name', filter.category_name || '')
      .set('status', filter.status || '')
      .set('limit', limit.toString())
      .set('page', pageno.toString());
    return this.http.get(`${environment.Url}/dashboard/filterProduct`, {
      params,
    });
  }
  getqueryParam(): Observable<any> {
    return this.activatedRoute.queryParams;
  }
  addproducts(productData: any) {
    return this.http
      .post(`${environment.Url}/dashboard/product`, productData)
      .subscribe({
        next: (data) => {
          console.log('new product added' + data);
        },
        error: (error) => {
          console.error('Error adding product:', error);
        },
      });
  }
  onmove(item: any) {
    console.log('service item', item);
    return this.http.post(`${environment.Url}/cart/create`, item);
  }

  isImage(url: string) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff'];
    const fileExtension = url
      .slice(((url.lastIndexOf('.') - 1) >>> 0) + 2)
      .toLowerCase();

    return imageExtensions.includes(`.${fileExtension}`);
  }

  getImports(userId: any) {
    return this.http.get(`${environment.Url}/import/files/${userId}`);
  }
  getUnreadNotifications(): Observable<any> {
    return this.http.get(`${environment.Url}/import/getNotifications`);
  }

  markNotificationsAsRead(): Observable<any> {
    return this.http.post(`${environment.Url}/import/markAsRead`, {});
  }
}
