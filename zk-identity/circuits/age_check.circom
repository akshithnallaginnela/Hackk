pragma circom 2.0.0;

include "node_modules/circomlib/circuits/comparators.circom";

template AgeCheck() {
    // Private inputs — never revealed to verifier
    signal input birthYear;
    signal input currentYear;

    // Public output — the only thing verifier sees
    signal output isAdult;

    component gte = GreaterEqThan(32);
    gte.in[0] <== currentYear - birthYear;
    gte.in[1] <== 18;

    isAdult <== gte.out;
}

component main {public [currentYear]} = AgeCheck();
