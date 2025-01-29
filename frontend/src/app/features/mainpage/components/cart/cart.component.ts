import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MainpageService } from '../../services/mainpage.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css'],
})
export class CartComponent implements OnInit {
  @Output() reload = new EventEmitter<any>();

  cart: any[] = [];
  constructor(private main: MainpageService, private toastr: ToastrService) {}
  quantity: number[] = [];
  i: number = 0;
  user_id!: number;
  ngOnInit(): void {
    //console.log(this.quantity[0]);
    this.main.cart.subscribe((data: any) => {
      cart: data;
      console.log('data' + data);
      this.quantity[this.i++] = 0;
      this.cart.push(data);
      console.log('cart', this.cart);
    });
  }
  value: any;
  add(index: number) {
    this.quantity[index] = this.quantity[index] + 1;
  }
  sub(index: number) {
    this.quantity[index] = this.quantity[index] - 1;
  }

  sendingdata: any[] = [];
  async addcards(item: any, event: any, index: number) {
    const checkvalid = (event.target as HTMLInputElement).checked;

    if (checkvalid) {
      item.quantity = this.quantity[index];
      console.log('quantity[i]', item.quantity);
      item.userid = this.user_id;
      this.sendingdata.push(item);
      console.log('sending data', this.sendingdata);
    }
  }
  // onmove() {
  //   // console.log('move');
  //   console.log('sending data', this.sendingdata);
  //   this.main.onmove(this.sendingdata).subscribe((data) => {
  //     this.toastr.success('Added to Cart', 'Success');
  //     console.log(data);
  //   });
  // }

  async onmove() {
    // console.log('move');
    console.log('sending data', this.sendingdata);
    if (this.sendingdata?.length > 0) {
      for (let item of this.sendingdata) {
        console.log('cart items ', item);
        await this.main.onmove(item).subscribe({
          next: (res: any) => {
            // console.log(res);
            this.reload.emit(1);
            this.toastr.success('successfully added');
          },
          error: (err: any) => {
            this.toastr.error(err.message);
          },
        });
      }
    } else {
      this.toastr.error('add items');
    }
  }

  removeItem(id: number): void {
    console.log('id');
    this.cart = this.cart.filter((item) => item.id !== id);
  }
}
