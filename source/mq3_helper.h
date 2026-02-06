#pragma once

#include <cmath>
#include <sys/types.h>

namespace DrunkAPI::MQ3
{
    /* MQ3 Gin Log-Log Best Fit Line Constants */ 
    // -----------------------------------------
    // RS / RO = 0.748207 * C^-0.2679
    // Equation 1: ln(Rs​/R0​)=mln(C)+b Solve for C

    // C mg/L= e^(ln(Rs​/R0​) + B / A)
    // Ethanol ppm = (mg/L * 24.45 * 1000) / MW approx 530.
    // Molecular Weight = 46.07 g/mol

    inline constexpr const double E_Slope = -0.268;
    inline constexpr const double E_Intercept = 0.29;
    
    // Equation 2: C mg/L = 10^( C*LOG(Rs/R0) - D )
    // --------------------------------------------
    inline constexpr const double L_Slope = -3.733; // Best fit line Slope
    inline constexpr const double L_Intercept = -0.47; // Intercept
    // 3.3V ADC -> 5V divider domain (your board scaling)

    inline constexpr const float Voltage_Factor = 1.5; // 3v3 -> 5v
    inline constexpr const u_int8_t BASE_10 = 10;
    inline constexpr const float VCC_5v = 5.0;

    // BAC/PPM
    inline constexpr const double Ethanol_Conversion = 530;
    inline constexpr const double PPM_BAC_Conversion = 0.000385505; // US BAC Factor

    inline double adc3v3_to_vout5(double vadc_3v3)
    {
        return vadc_3v3 * Voltage_Factor;
    }

    // Compute Rs from measured Vout (using RL and Vcc) stable or not.
    inline double vout5_to_rs(double vout_5v, double RLoad, double Vcc = VCC_5v)
    {
        return RLoad * ((Vcc / vout_5v) - 1.0);
    }

    inline double adc3v3_to_rs(double vadc_3v3, double RLoad, double Vcc = VCC_5v)
    {
        return vout5_to_rs(adc3v3_to_vout5(vadc_3v3), RLoad, Vcc);
    }

    inline double rs_to_ratio(double rstable, double r0_air)
    {
        return rstable / r0_air;
    }

    inline double adc3v3_to_ratio(double vadc_3v3, double RLoad, double r0_air, double Vcc = VCC_5v)
    {
        return rs_to_ratio(adc3v3_to_rs(vadc_3v3, RLoad, Vcc), r0_air);
    }

    // Can you either or slope equations to get mg/L 
    inline double calculate_concentration_Log_10(double rs_ro)
    {
        return std::pow(BASE_10,(L_Slope * std::log10(rs_ro)) + L_Intercept);
    }

    // Another version to get mg/l given rs/ro
    inline double calculate_concentration_exp(double rs_ro)
    {
        return std::exp((std::log(rs_ro) + E_Intercept) / E_Slope);
    }

    inline double calculate_ppm(double concentration)
    {
        double ppm = concentration * Ethanol_Conversion;
        return ppm;
    }

    inline double calculate_bac(double ppm)
    {
        double BAC = ppm * PPM_BAC_Conversion;
        return BAC;
    }
    
}
