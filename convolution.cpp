using namespace std;

#include <iostream>

template <size_t size_x, size_t size_y>
int** convolution3(int array[size_x][size_y], int filter[3][3]) {
    int** result = 0;
    result = new int*[size_x];

    for (int i = 1; i < size_x-1; i++) {
        result[i] = new int[size_y];

        for (int j = 1; j < size_y-1; j++) {
            int val = filter[0][0] * array[i-1][j-1] + filter[1][0] * array[i][j-1] + filter[2][0] * array[i+1][j-1] + 
                      filter[0][1] * array[i-1][j+0] + filter[1][1] * array[i][j+0] + filter[2][1] * array[i+1][j+0] + 
                      filter[0][2] * array[i-1][j+1] + filter[1][2] * array[i][j+1] + filter[2][2] * array[i+1][j+1];
            result[i][j] = val;
        }
    }
    return result;
}

int main() {
    
}