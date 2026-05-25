pragma circom 2.0.0;

include "node_modules/circomlib/circuits/comparators.circom";

template IncomeRange() {
    // Private inputs — never revealed
    signal input income;
    
    // Public inputs — verifier knows the range boundaries
    signal input lowerBound;
    signal input upperBound;

    // Public output
    signal output inRange;

    // Check income >= lowerBound
    component gte = GreaterEqThan(64);
    gte.in[0] <== income;
    gte.in[1] <== lowerBound;

    // Check income <= upperBound
    component lte = LessEqThan(64);
    lte.in[0] <== income;
    lte.in[1] <== upperBound;

    // Both must be true
    inRange <== gte.out * lte.out;
}

component main {public [lowerBound, upperBound]} = IncomeRange();
